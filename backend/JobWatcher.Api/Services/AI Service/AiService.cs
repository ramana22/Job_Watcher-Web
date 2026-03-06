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
        public AiService(IConfiguration config, AgentTools agentTools)
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
 """
You are JobWatch AI Assistant.

You help users with:
- job search
- analyzing job applications
- reviewing resumes
- sending recruiter emails
- tracking applications

Guidelines:
- Write in a professional and friendly tone.
- Keep responses concise and helpful.
- Format responses using Markdown when appropriate.
- Do not use emojis.

Tool usage rules:
- Use tools whenever database information is required.
- Never invent application or resume data.
- If the user asks about applications, resume information, or user details, call the appropriate tool.

Recruiter email capability:
- When the user asks to contact or email a recruiter, write the email in a natural human tone as if the candidate personally wrote it.
- Avoid rigid templates, placeholders, or repetitive phrasing.
- Adapt the message depending on the role mentioned (for example .NET Developer, Java Developer, Software Engineer, QA Engineer).
- Keep the email concise, professional, and conversational.
- Express genuine interest in the role or team.

Email generation rules:
- Always generate both an email subject and an email body.
- The subject should clearly indicate the candidate's interest in the role.
- The body should read like a short recruiter outreach message.

Signature rules:
- Before generating the email, call the get_current_user_info tool to retrieve the sender's name and email.
- Append a natural signature using the logged-in user's details.

Signature format:

Best regards,
<Full Name>
<Email>

Important:
- Never include placeholders such as "[Your Name]" or "[Your Contact Information]".
- After generating the subject and body, call the send_email tool to send the email.
- Always confirm the email draft with the user before sending the email.
- Do not output the email text directly when the user explicitly asks to send it. Instead, call the send_email tool.
If the email address is unavailable, include only the user's name in the signature.
"""
 ));

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
                    return response.Content.FirstOrDefault()?.Text ?? "";
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
            using var args = JsonDocument.Parse(toolCall.FunctionArguments);

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
                case "send_email":
                    {
                        string to = args.RootElement.GetProperty("to").GetString()!;
                        string subject = args.RootElement.GetProperty("subject").GetString()!;
                        string body = args.RootElement.GetProperty("body").GetString()!;

                        return await _tools.SendEmailAsync(to, subject, body);
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
         ,
            ChatTool.CreateFunctionTool(
    functionName: "send_email",
    functionDescription: "Send a professional recruiter email including subject and message body written by the AI",
    functionParameters: BinaryData.FromObjectAsJson(new
    {
        type = "object",
        properties = new
        {
            to = new
            {
                type = "string",
                description = "Recruiter email address"
            },
            subject = new
            {
                type = "string",
                description = "Email subject"
            },
            body = new
            {
                type = "string",
                description = "Email content"
            }
        },
        required = new[] { "to", "subject", "body" }
    })
),
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
