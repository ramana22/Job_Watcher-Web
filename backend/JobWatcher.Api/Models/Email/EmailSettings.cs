namespace JobWatcher.Api.Models.Email
{

    public class EmailSettings
    {
        public string SmtpHost { get; set; }
        public int SmtpPort { get; set; }
        public string SmtpUser { get; set; }
        public string SmtpPass { get; set; }
        public string MailFrom { get; set; }
        public string MailTo { get; set; }
    }


}
