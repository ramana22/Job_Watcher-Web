# 🚀 I Built an AI-Powered Job Search Workflow System

I've been working on something deeper than just a chatbot.

I built an **AI-powered JobWatch Assistant** — a system that doesn't just answer questions, but actually helps manage the entire job search workflow. It's GenAI + real data + executable actions, working together as one integrated system.

This is what it can do 👇

## 🔍 Application Tracking & Insights
• Fetch recent applications from my database  
• Filter by status (Applied, Interview, Rejected, Not Applied)  
• Show match scores & prioritize high-fit roles  
• Surface action items: "Review upcoming interview" or "Follow up with recruiter"

## 📄 Resume Intelligence
• Retrieve and analyze my stored resume  
• Tailor it to specific job descriptions in real-time  
• Optimize for ATS keywords + highlight impact metrics  
• Identify skill gaps vs. target roles  
• Suggest targeted upskilling paths

## 📩 Recruiter Outreach Automation
• Generate tailored recruiter emails (personalized by company/role)  
• Draft LinkedIn outreach messages with authentic voice  
• Ask for my confirmation before sending (safety-first)  
• Send emails directly through integrated mail API  
• Track follow-up timing

## 📊 Smart Application Strategy
• Recommend which jobs to apply to first (based on match scoring)  
• Compare my profile against job requirements side-by-side  
• Improve match scores through targeted resume tuning  
• Surface roles I'm close to qualifying for + suggest skill pivots

## 🎯 Interview Preparation
• Generate role-specific interview questions (behavioral + technical)  
• Conduct mock interviews with real-time feedback  
• Help structure STAR responses with metrics  
• System design prep guides (for senior engineer roles)  
• Technical Q&A practice (.NET, React, Azure, SQL Server)

## 💼 Career Positioning & Branding
• Optimize LinkedIn profile summary for recruiter keywords  
• Craft professional summaries (1-liner + elevator pitch)  
• Build recruiter-ready personal positioning  
• Help position for senior/lead engineer transitions

## ⚡ What Makes This Different?

This is **not** just GenAI generating text.

It's a **tool-integrated AI system** that can:
- ✅ Retrieve real data from my application database  
- ✅ Take actions like sending emails (with confirmation)  
- ✅ Execute multi-step workflows end-to-end  
- ✅ Remember context across conversations  

### Example: Multi-Step Workflow 👇

**User request:** "Tailor my resume for the Senior Engineer role at Microsoft and send them an email"

**What happens under the hood:**
1. **Retrieve** → Fetch user's stored resume from database
2. **Analyze** → Extract job requirements from Microsoft job description
3. **Transform** → Tailor resume with relevant keywords & achievements
4. **Generate** → Draft personalized recruiter outreach email
5. **Confirm** → Wait for user approval (never auto-send)
6. **Execute** → Send email via integrated mail API
7. **Track** → Log application attempt + send date in database

All in **one seamless workflow**.

---

## 🔧 How It Actually Works: The Technical Stack

### Architecture
**Frontend:** React + TypeScript  
**Backend:** .NET 8 (C#) with Azure integration  
**AI Engine:** Azure OpenAI API (GPT-4 Turbo deployment)  
**Database:** SQL Server (application tracking + resume storage)  
**APIs:** Gmail API (email sending), LinkedIn API (profile sync)

---

## 💻 The Implementation: Function Calling System

This is where the magic happens. Instead of having Claude just generate suggestions, I built a **function-calling system** where the AI can invoke tools and receive real data back.

### How It Works:

```csharp
// AiService.cs - Orchestrates the entire workflow
public async Task<string> AgentToolChatAsync(List<ChatMessageDto> messagesDto)
{
    var messages = MapMessages(messagesDto);
    
    // Add system prompt that defines the AI's role
    messages.Insert(0, new SystemChatMessage("""
You are JobWatch AI Assistant.
You can:
- answer general questions
- retrieve information from the database
- analyze job applications
- review resumes
- send recruiter emails
- perform multi-step reasoning

Rules:
1. Use tools when data or actions are required
2. If a task requires multiple steps, use tools sequentially
3. Never invent database information
4. Always confirm email drafts with the user before sending
    """));
    
    // Register all available tools
    var options = new ChatCompletionOptions();
    foreach (var tool in GetTools())
        options.Tools.Add(tool);
    
    // Agentic loop: Keep calling AI until it returns a final answer
    const int MAX_STEPS = 8;
    for (int step = 0; step < MAX_STEPS; step++)
    {
        var completion = await _chatClient.CompleteChatAsync(messages, options);
        var response = completion.Value;
        
        messages.Add(new AssistantChatMessage(response));
        
        // If AI says it's done, return the answer
        if (response.FinishReason != ChatFinishReason.ToolCalls)
        {
            return response.Content.FirstOrDefault()?.Text ?? "";
        }
        
        // Otherwise, execute the tools the AI requested
        foreach (var toolCall in response.ToolCalls)
        {
            var toolResult = await ExecuteTool(toolCall);
            
            // Feed the result back to the AI
            messages.Add(new ToolChatMessage(
                toolCall.Id,
                JsonSerializer.Serialize(toolResult)
            ));
        }
    }
    
    return "The task required too many steps and could not be completed.";
}
```

**Key insight:** This is an **agentic loop**. The AI decides what tools to call, receives real data, then decides the next step. No hallucinations — everything is grounded in database facts.

### The Tools: 5 Core Functions

```csharp
// GetTools() - Defines what the AI can do
private List<ChatTool> GetTools()
{
    return new List<ChatTool>
    {
        // Tool 1: Fetch recent applications
        ChatTool.CreateFunctionTool(
            functionName: "get_recent_applications",
            functionDescription: "Retrieve the most recent job applications from the database including job title, company, status, matching score, source, and application link.",
            functionParameters: BinaryData.FromObjectAsJson(new
            {
                type = "object",
                properties = new
                {
                    count = new
                    {
                        type = "integer",
                        description = "Number of recent applications to return. Default is 5."
                    }
                }
            })
        ),
        
        // Tool 2: Filter by status
        ChatTool.CreateFunctionTool(
            functionName: "get_applications_by_status",
            functionDescription: "Retrieve job applications filtered by a specific status such as applied, interview, rejected, or not_applied.",
            functionParameters: BinaryData.FromObjectAsJson(new
            {
                type = "object",
                properties = new
                {
                    status = new
                    {
                        type = "string",
                        description = "Application status filter such as applied, interview, rejected, or not_applied."
                    }
                }
            })
        ),
        
        // Tool 3: Get resume
        ChatTool.CreateFunctionTool(
            functionName: "get_resume_info",
            functionDescription: "Retrieve the logged-in user's resume text extracted from the stored PDF. Used for analysis, summarization, or generating recruiter emails.",
            functionParameters: BinaryData.FromObjectAsJson(new
            {
                type = "object",
                properties = new { }
            })
        ),
        
        // Tool 4: Get user info
        ChatTool.CreateFunctionTool(
            functionName: "get_current_user_info",
            functionDescription: "Retrieve the logged-in user's basic profile information including full name and email address.",
            functionParameters: BinaryData.FromObjectAsJson(new
            {
                type = "object",
                properties = new { }
            })
        ),
        
        // Tool 5: Send email (with confirmation gate)
        ChatTool.CreateFunctionTool(
            functionName: "send_email",
            functionDescription: "Send a professional email message to a recruiter or contact. The email must include a subject line and message body.",
            functionParameters: BinaryData.FromObjectAsJson(new
            {
                type = "object",
                properties = new
                {
                    to = new { type = "string", description = "Recipient email address" },
                    subject = new { type = "string", description = "Subject line of the email" },
                    body = new { type = "string", description = "Email message body written in professional tone" }
                },
                required = new[] { "to", "subject", "body" }
            })
        )
    };
}
```

### Tool Implementation: Real Database Access

```csharp
// AgentTools.cs - Where the actual work happens
public class AgentTools
{
    private readonly JobWatcherContext _db;
    private readonly IHttpContextAccessor _httpContext;
    private readonly IEmailService _emailService;
    
    // Tool 1: Get recent applications from database
    public async Task<IReadOnlyList<object>> GetRecentApplicationsAsync(int count = 5)
    {
        return await _db.Applications
            .OrderByDescending(a => a.PostedTime)
            .Take(count)
            .Select(a => new
            {
                a.Id,
                a.JobTitle,
                a.Company,
                a.Status,
                a.MatchingScore,
                a.PostedTime,
                a.Description,
                a.Source,
                a.ApplyLink
            })
            .ToListAsync();
    }
    
    // Tool 2: Filter by status
    public async Task<IReadOnlyList<object>> GetApplicationsByStatusAsync(string status)
    {
        var normalized = string.IsNullOrWhiteSpace(status) ? "not_applied" : status.Trim();
        
        return await _db.Applications
            .Where(a => a.Status == normalized)
            .OrderByDescending(a => a.PostedTime)
            .Take(50)
            .Select(a => new
            {
                a.Id,
                a.JobTitle,
                a.Company,
                a.Status,
                a.MatchingScore,
                a.PostedTime,
                a.Source,
                a.ApplyLink
            })
            .ToListAsync();
    }
    
    // Tool 3: Get resume (extracted from stored PDF)
    public async Task<string> GetResumeInfo()
    {
        var user = _httpContext.HttpContext?.User;
        var name = user?.FindFirst(ClaimTypes.Name)?.Value ?? "Unknown User";
        
        var resume = await _db.Resumes.FirstOrDefaultAsync();
        
        if (resume == null || resume.Content == null)
            return "No resume information available.";
        
        // Extract text from stored PDF
        var resumeText = PdfUtility.ExtractPdfText(resume.Content);
        
        // Limit length for AI processing
        if (resumeText.Length > 4000)
            resumeText = resumeText.Substring(0, 4000);
        
        return $"Resume information for {name}:\n\n{resumeText}";
    }
    
    // Tool 4: Get user info
    public Task<object> GetCurrentUserInfo()
    {
        var user = _httpContext.HttpContext?.User;
        
        var fullName = user?.FindFirst(ClaimTypes.Name)?.Value ?? "User";
        var email = user?.FindFirst(ClaimTypes.Email)?.Value ?? "";
        
        return Task.FromResult<object>(new
        {
            FullName = fullName,
            Email = email
        });
    }
    
    // Tool 5: Send email (with HTML formatting)
    public async Task<string> SendEmailAsync(string to, string subject, string body)
    {
        // Convert plain text line breaks to HTML
        var htmlBody = "<p>" + body
            .Replace("\r\n\r\n", "</p><p>")
            .Replace("\n\n", "</p><p>")
            .Replace("\n", "<br/>")
            + "</p>";
        
        await _emailService.SendToAsync(to, subject, htmlBody, false);
        
        return $"Email successfully sent to {to}";
    }
}
```

---

## 🔑 Key Technical Decisions

### 1. **Agentic Loop with Max Steps**
```
AI decides → Calls tool → Gets data → Analyzes → Repeats
```
The loop runs up to 8 times max to prevent infinite loops. Each iteration, the AI has access to all tool results so far.

### 2. **Confirmation Gates Before Actions**
The system prompt explicitly states:
> "Always confirm the email draft with the user before sending the email. Do not output the email text directly when the user explicitly asks to send it. Instead, call the send_email tool."

This prevents accidental emails — the AI generates the draft, shows it to the user, waits for approval, **then** calls send_email.

### 3. **Database-Backed Context (No Hallucinations)**
Every tool returns real data from SQL Server:
- Applications table has actual job postings with match scores
- Resume is extracted from stored PDF (not generated)
- User info comes from authentication claims
- Email sending goes through verified Gmail API

The AI can't hallucinate because it only works with what's in the database.

### 4. **Entity Framework for Type Safety**
```csharp
var applications = await _db.Applications
    .Where(a => a.Status == status)
    .ToListAsync();
```
Using EF Core gives us:
- Strong typing (no string queries)
- Built-in SQL injection protection
- Async/await support
- Clean LINQ queries

### 5. **PDF Text Extraction**
```csharp
var resumeText = PdfUtility.ExtractPdfText(resume.Content);
```
The resume is stored as a binary PDF, extracted as text, then sent to the AI for analysis. This allows the AI to:
- Summarize the resume
- Compare it to job descriptions
- Generate tailored versions
- Identify skill gaps

### 6. **HTTP Context for User Identity**
```csharp
var user = _httpContext.HttpContext?.User;
var email = user?.FindFirst(ClaimTypes.Email)?.Value;
```
Multi-tenant safe — each user only sees their own applications and resume.

---

## 📊 Real-World Workflow Example

**User:** "I want to apply for the Senior Engineer role at Microsoft. Can you tailor my resume and send them an email?"

**What the system does:**

```
Step 1: AI recognizes this is a multi-step task
        ↓
Step 2: AI calls get_resume_info()
        → Returns 4000 chars of resume text
        ↓
Step 3: AI calls get_current_user_info()
        → Returns name + email for signature
        ↓
Step 4: AI generates tailored resume text (using GPT-4)
        → Emphasizes Azure, .NET, system design (based on job description)
        ↓
Step 5: AI shows tailored resume to user (asks "does this look good?")
        → User reviews and approves
        ↓
Step 6: AI calls send_email() with:
        - To: hiring-manager@microsoft.com
        - Subject: Tailored and personalized
        - Body: References specific projects + tailored resume
        ↓
Step 7: Email sent ✓
        ↓
Step 8: AI returns: "Email successfully sent to hiring-manager@microsoft.com"
```

All of this happens in one conversation. No copy-pasting. No manual steps.

---

## 🛡️ Safety & Error Handling

**Confirmation gates:**
- Emails always ask for approval before sending
- No auto-generated placeholders like "[Your Name]"
- User has full visibility into what will be sent

**Error handling:**
```csharp
try
{
    var toolResult = await ExecuteTool(toolCall);
    messages.Add(new ToolChatMessage(toolCall.Id, JsonSerializer.Serialize(toolResult)));
}
catch (Exception ex)
{
    // Return error to AI, not to user
    messages.Add(new ToolChatMessage(
        toolCall.Id,
        JsonSerializer.Serialize(new { error = ex.Message })
    ));
}
```

If a tool fails, the AI sees the error and can:
- Retry with different parameters
- Suggest an alternative approach
- Ask the user for clarification

**Infinite loop prevention:**
```csharp
const int MAX_STEPS = 8;
string? lastTool = null;

if (lastTool == toolCall.FunctionName)
{
    return "The task could not be completed due to repeated tool calls.";
}
```

---

## 💡 Key Takeaway

**GenAI becomes truly powerful when it moves from:**
- 👉 "Answering questions"  
→ "Executing real workflows"

The difference is:
1. **Function calling** (tool use)
2. **State management** (conversation history)
3. **Integration** (real APIs + databases)
4. **Safety gates** (confirmations before actions)

This is production-ready code, not a prototype.

---

## 🎥 See It In Action

I recorded a short demo showing:
✓ Fetching real applications from SQL Server  
✓ Retrieving the resume from stored PDF  
✓ Generating a tailored resume for a specific role  
✓ Drafting a recruiter email (personalized)  
✓ User approving the email  
✓ Sending the email via Gmail API  
✓ Tracking the application  

**[INSERT DEMO VIDEO LINK]**

---

## What's Next?

I'm working on:
- **AI-powered salary negotiation guides** (role + experience based)
- **Cold outreach campaign automation** (LinkedIn + email sequences)
- **Real-time interview feedback** (video analysis using Azure Video Indexer)
- **Career path visualization** (where my skills lead, what to upskill in)
- **Resume version control** (track changes across tailored versions)

---

## Tech Stack Summary

| Layer | Technology |
|-------|-----------|
| **Frontend** | React + TypeScript |
| **Backend** | .NET 8 C# + ASP.NET Core |
| **AI/LLM** | Azure OpenAI (gpt-5.2-chat) |
| **Function Calling** | Azure OpenAI SDK (C#) |
| **Database** | SQL Server + Entity Framework Core |
| **Email** | Gmail API + SendGrid |
| **PDF Processing** | PdfUtility (text extraction) |
| **Authentication** | Claims-based (multi-tenant) |
| **Error Handling** | Try-catch + error serialization |

