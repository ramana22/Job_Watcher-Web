namespace JobWatcher.Api.Models.Chat
{
    public class ChatRequest
    {
        public List<ChatMessageDto> Messages { get; set; }
    }

    public class ChatMessageDto
    {
        public string Role { get; set; }  // "user" | "assistant" | "system"
        public string Content { get; set; }
    }
}
