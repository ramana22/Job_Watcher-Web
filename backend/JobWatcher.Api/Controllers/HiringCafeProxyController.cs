using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using System.Text;
using System.Text.Json;

namespace JobWatcher.Api.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class HiringCafeProxyController : ControllerBase
    {
        private readonly IHttpClientFactory _httpClientFactory;
        private readonly IConfiguration _config;

        public HiringCafeProxyController(IHttpClientFactory httpClientFactory, IConfiguration config)
        {
            _httpClientFactory = httpClientFactory;
            _config = config;
        }

        [HttpPost("fetch")]
        public async Task<IActionResult> FetchJobs(
            [FromBody] object payload,
            [FromHeader(Name = "X-Auth")] string token)
        {
            // 🔒 Simple token-based security
            var expected = _config["ProxyAuthToken"];
            if (!string.IsNullOrEmpty(expected) && token != expected)
                return Unauthorized(new { message = "Invalid or missing X-Auth token." });

            var client = _httpClientFactory.CreateClient();
            var apiUrl = "https://hiring.cafe/api/search-jobs";

            // ✅ Correct JSON serialization of incoming payload
            var jsonBody = JsonSerializer.Serialize(payload);
            var request = new HttpRequestMessage(HttpMethod.Post, apiUrl)
            {
                Content = new StringContent(jsonBody, Encoding.UTF8, "application/json")
            };

            // Forward minimal headers
            request.Headers.Add("User-Agent", "JobWatcherProxy/1.0");
            request.Headers.Add("Accept", "application/json, text/plain, */*");

            try
            {
                var response = await client.SendAsync(request);
                var content = await response.Content.ReadAsStringAsync();

                // Handle upstream errors clearly
                if (!response.IsSuccessStatusCode)
                {
                    return StatusCode((int)response.StatusCode, new
                    {
                        error = "Upstream HiringCafe call failed",
                        status = response.StatusCode,
                        details = content
                    });
                }

                // Avoid empty body crashes
                if (string.IsNullOrWhiteSpace(content))
                    return Ok(new { results = new object[0] });

                // ✅ Return original HiringCafe JSON
                return new ContentResult
                {
                    Content = content,
                    ContentType = "application/json",
                    StatusCode = (int)response.StatusCode
                };
            }
            catch (Exception ex)
            {
                return StatusCode(500, new
                {
                    error = "Proxy internal error",
                    message = ex.Message
                });
            }
        }
    }
}
