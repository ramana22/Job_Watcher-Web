using JobWatcher.Api.Models.Chat;
using JobWatcher.Api.Services.AI_Service;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using System.Text.Json;

namespace JobWatcher.Api.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class ChatController : ControllerBase
    {
        private readonly AiService _aiService;

        public ChatController(AiService aiService)
        {
            _aiService = aiService;
        }

        [HttpPost]
        public async Task<IActionResult> Chat([FromBody] ChatRequest request)
        {
            try
            {
                var reply = await _aiService.AgentToolChatAsync(request.Messages);

                return Ok(new ChatResponse
                {
                    Reply = reply
                });
            }
            catch (Exception ex)
            {
                return Problem(
                    title: "Chat request failed.",
                    detail: ex.Message,
                    statusCode: StatusCodes.Status502BadGateway);
            }
        }

        [HttpPost("stream")]
        public async Task Stream([FromBody] ChatRequest request)
        {
            Response.ContentType = "text/event-stream";
            Response.Headers["Cache-Control"] = "no-cache";
            Response.Headers["X-Accel-Buffering"] = "no";

            try
            {
                await foreach (var chunk in _aiService.StreamChatAsync(request.Messages))
                {
                    await Response.WriteAsync($"data: {chunk}\n\n");
                    await Response.Body.FlushAsync();
                }
            }
            catch (Exception ex)
            {
                var payload = JsonSerializer.Serialize(new { error = ex.Message });

                await Response.WriteAsync($"event: error\ndata: {payload}\n\n");
                await Response.Body.FlushAsync();
            }
        }
    }
}
