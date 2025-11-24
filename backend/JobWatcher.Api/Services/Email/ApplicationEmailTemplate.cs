using System.Text;
using JobWatcher.Api.Models;

namespace JobWatcher.Api.Services.Email
{
    public static class ApplicationEmailTemplate
    {
        public static string BuildJobEmail(List<Application> jobs)
        {
            var sb = new StringBuilder();

            sb.Append($@"
            <html>
            <body style='font-family: Arial, sans-serif; font-size: 14px;'>
                <h3>New HiringCafe Job Listings ({DateTime.UtcNow:yyyy-MM-dd HH:mm})</h3>

                <table border='1' cellspacing='0' cellpadding='6'
                       style='border-collapse: collapse; width: 100%; font-size: 13px;'>
                    <thead>
                        <tr style='background-color:#f2f2f2;'>
                            <th>Job Title</th>
                            <th>Company</th>
                            <th>Location</th>
                            <th>Salary</th>
                            <th>Apply Link</th>
                            <th>Search Key</th>
                        </tr>
                    </thead>
                    <tbody'>");

            foreach (var job in jobs)
            {
                sb.Append($@"
                    <tr>
                        <td>{job.JobTitle}</td>
                        <td>{job.Company}</td>
                        <td>{job.Location}</td>
                        <td>{job.Salary}</td>
                        <td><a href='{job.ApplyLink}'>Apply</a></td>
                        <td>{job.SearchKey}</td>
                    </tr>");
            }

            sb.Append($@"
                    </tbody>
                </table>

                <br/>
                <i>Total new jobs: {jobs.Count}</i>
            </body>
            </html>");

            return sb.ToString();
        }
    }
}
