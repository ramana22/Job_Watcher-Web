namespace JobWatcher.Api.Services.AI_Service
{
    [AttributeUsage(AttributeTargets.Method)]
    public class AgentToolAttribute : Attribute
    {
        public string Name { get; }
        public string Description { get; }

        public AgentToolAttribute(string name, string description)
        {
            Name = name;
            Description = description;
        }
    }
}
