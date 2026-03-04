using Azure;
using Azure.AI.OpenAI;
using Azure.Identity;
using JobWatcher.Api.Models.Chat;
using Microsoft.AspNetCore.Connections;
using OpenAI;
using OpenAI.Chat;
using System.ClientModel;
using System.Text.Json;


namespace JobWatcher.Api.Services.AI_Service
{
    public class AiService
    {
        private readonly ChatClient _chatClient;
        private readonly AgentTools _tools;
        public AiService(IConfiguration config , AgentTools agentTools)
        {
            _tools = agentTools;
            var endpoint = config["AzureOpenAI:Endpoint"];
            var deployment = config["AzureOpenAI:DeploymentName"];
            var apiKey = config["AzureOpenAI:Key"];

            if (string.IsNullOrWhiteSpace(endpoint) ||
                string.IsNullOrWhiteSpace(deployment) ||
                string.IsNullOrWhiteSpace(apiKey))
            {
                throw new InvalidOperationException(
                    "Azure OpenAI is not configured. Set AzureOpenAI:Endpoint, AzureOpenAI:DeploymentName, and AzureOpenAI:Key in configuration.");
            }
            // string model_name = config["AzureOpenAI:ModelName"]!;
            // string apiVersion = config["AzureOpenAI:ApiVersion"]!;

            var openAIClient = new AzureOpenAIClient(
        new Uri(endpoint),
        new AzureKeyCredential(apiKey));

            _chatClient = openAIClient.GetChatClient(deployment);
        }
  
        public async Task<string> GeneralChatAsync(List<ChatMessageDto> messagesDto)
        {
            var messages = new List<ChatMessage>();

            foreach (var msg in messagesDto)
            {
                messages.Add(msg.Role.ToLower() switch
                {
                    "system" => new SystemChatMessage(msg.Content),
                    "assistant" => new AssistantChatMessage(msg.Content),
                    _ => new UserChatMessage(msg.Content)
                });
            }

            var completion = await _chatClient.CompleteChatAsync(messages);

            return completion.Value.Content[0].Text;
        }
        //public async Task<string> GeneralSingleChatAsync(ChatMessageDto messageDto)
        //{
        //    //var messages = new List<ChatMessage>();

        //    //foreach (var msg in messagesDto)
        //    //{
        //    //    messages.Add(msg.Role.ToLower() switch
        //    //    {
        //    //        "system" => new SystemChatMessage(msg.Content),
        //    //        "assistant" => new AssistantChatMessage(msg.Content),
        //    //        _ => new UserChatMessage(msg.Content)
        //    //    });
        //    //}
        //    var msg = [new SystemChatMessage("You are a helpful assistant that provides concise answers")]

        //    var completion = await _chatClient.CompleteChatAsync(messages);

        //    return completion.Value.Content[0].Text;
        //}


        public async IAsyncEnumerable<string> StreamChatAsync(
   List<ChatMessageDto> messagesDto)
        {
            var messages = MapMessages(messagesDto);

            var response = _chatClient.CompleteChatStreaming(messages);

            foreach (StreamingChatCompletionUpdate update in response)
            {
                foreach (ChatMessageContentPart updatePart in update.ContentUpdate)
                {
                    if (!string.IsNullOrWhiteSpace(updatePart.Text))
                    {
                        yield return updatePart.Text;
                    }
                }
            }
        }

        public async Task<string> AgentToolChatAsync(List<ChatMessageDto> messagesDto)
        {
            var messages = MapMessages(messagesDto);
            messages.Insert(0, new SystemChatMessage(
        "You are a job application assistant. Use tools when data from the database is needed."));

            var options = new ChatCompletionOptions();

            foreach (var tool in GetTools())
            {
                options.Tools.Add(tool);
            }

            while (true)
            {
                var completion = await _chatClient.CompleteChatAsync(messages, options);
                var response = completion.Value;

                messages.Add(new AssistantChatMessage(response));

                if (response.FinishReason != ChatFinishReason.ToolCalls)
                {
                    return response.Content[0].Text;
                }

                foreach (var toolCall in response.ToolCalls)
                {
                    var toolResult = await ExecuteTool(toolCall);

                    messages.Add(new ToolChatMessage(
                        toolCall.Id,
                        JsonSerializer.Serialize(toolResult)));
                }
            }
        }

        private async Task<object> ExecuteTool(ChatToolCall toolCall)
        {
            var args = JsonDocument.Parse(toolCall.FunctionArguments);

            switch (toolCall.FunctionName)
            {
                case "get_recent_applications":
                    {
                        int count = args.RootElement.TryGetProperty("count", out var c)
                            ? c.GetInt32()
                            : 5;

                        return await _tools.GetRecentApplicationsAsync(count);
                    }

                case "get_applications_by_status":
                    {
                        string status = args.RootElement.GetProperty("status").GetString() ?? "not_applied";

                        return await _tools.GetApplicationsByStatusAsync(status);
                    }

                case "get_resume_info":
                    {
                        return await _tools.GetResumeInfo();
                    }

                case "get_current_user_info":
                    {
                        return await _tools.GetCurrentUserInfo();
                    }
                default:
                    throw new InvalidOperationException($"Unknown tool: {toolCall.FunctionName}");
            }
        }

        private List<ChatTool> GetTools()
        {
            return new List<ChatTool>
    {
        ChatTool.CreateFunctionTool(
            functionName: "get_recent_applications",
            functionDescription: "Returns most recent job applications",
            functionParameters: BinaryData.FromObjectAsJson(new
            {
                type = "object",
                properties = new
                {
                    count = new
                    {
                        type = "integer",
                        description = "Number of applications to return"
                    }
                }
            })
        ),

        ChatTool.CreateFunctionTool(
            functionName: "get_applications_by_status",
            functionDescription: "Get applications filtered by status",
            functionParameters: BinaryData.FromObjectAsJson(new
            {
                type = "object",
                properties = new
                {
                    status = new
                    {
                        type = "string",
                        description = "Application status like applied, interview, rejected"
                    }
                }
            })
        ),

        ChatTool.CreateFunctionTool(
            functionName: "get_resume_info",
            functionDescription: "Fetch the logged in user's resume content",
            functionParameters : BinaryData.FromObjectAsJson(new
            {
                type = "object",
                properties = new { }
            })

            )
        ,
         ChatTool.CreateFunctionTool(
            functionName: "get_current_user_info",
            functionDescription: "Returns details about the currently logged in user",
            functionParameters: BinaryData.FromObjectAsJson(new
            {
                type = "object",
                properties = new { }
            })
        )
    };
        }



        private static List<ChatMessage> MapMessages(List<ChatMessageDto> messagesDto)
        {
            var messages = new List<ChatMessage>(messagesDto.Count);
            foreach (var msg in messagesDto)
            {
                messages.Add(msg.Role.ToLower() switch
                {
                    "system" => new SystemChatMessage(msg.Content),
                    "assistant" => new AssistantChatMessage(msg.Content),
                    _ => new UserChatMessage(msg.Content)
                });
            }
            return messages;
        }

    }
}
