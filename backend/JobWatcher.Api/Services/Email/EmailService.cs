using JobWatcher.Api.Models.Email;
using MailKit.Net.Smtp;
using MailKit.Security;
using Microsoft.Extensions.Options;
using MimeKit;
using JobWatcher.Api.Models;

namespace JobWatcher.Api.Services.Email
{
    public class EmailService : IEmailService
    {
        private readonly EmailSettings _settings;

        public EmailService(IOptions<EmailSettings> settings)
        {
            _settings = settings.Value;
        }

        public async Task SendAsync(string subject, string htmlBody)
        {
            await SendToAsync(_settings.MailTo, subject, htmlBody);
        }

        public async Task SendToAsync(string to, string subject, string htmlBody)
        {
            var message = new MimeMessage();
            message.From.Add(new MailboxAddress("JobWatcher Bot", _settings.MailFrom));
            message.To.Add(new MailboxAddress(to, to));
            message.Subject = subject;

            var bodyBuilder = new BodyBuilder
            {
                HtmlBody = htmlBody
            };

            message.Body = bodyBuilder.ToMessageBody();

            using var smtp = new SmtpClient();

            await smtp.ConnectAsync(_settings.SmtpHost, _settings.SmtpPort, SecureSocketOptions.StartTls);
            await smtp.AuthenticateAsync(_settings.SmtpUser, _settings.SmtpPass);
            await smtp.SendAsync(message);
            await smtp.DisconnectAsync(true);
        }
        public async Task SendApplicationsAsync(List<Application> applications)
        {
            string html = ApplicationEmailTemplate.BuildJobEmail(applications);
            string subject = $"[HiringCafe] {applications.Count} matching job(s) • {DateTime.UtcNow:yyyy-MM-dd HH:mm}";

            await SendToAsync(_settings.MailTo, subject, html);
        }

    }

    public interface IEmailService
    {
        Task SendAsync(string subject, string htmlBody);
        Task SendToAsync(string to, string subject, string htmlBody);
        Task SendApplicationsAsync(List<Application> applications);

    }
}
