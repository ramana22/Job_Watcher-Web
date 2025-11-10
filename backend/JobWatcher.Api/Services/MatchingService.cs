using System.Text.RegularExpressions;

namespace JobWatcher.Api.Services;

public class MatchingService
{
    private static readonly Regex Tokenizer = new("[^a-zA-Z0-9\\s]", RegexOptions.Compiled);

    public double CalculateScore(string? resumeText, params string?[] jobFields)
    {
        if (string.IsNullOrWhiteSpace(resumeText))
        {
            return 0;
        }

        var resumeTokens = new HashSet<string>(Normalize(resumeText));
        if (resumeTokens.Count == 0)
        {
            return 0;
        }

        var jobTokens = new List<string>();
        foreach (var field in jobFields)
        {
            if (!string.IsNullOrWhiteSpace(field))
            {
                jobTokens.AddRange(Normalize(field!));
            }
        }

        if (jobTokens.Count == 0)
        {
            return 0;
        }

        var matches = jobTokens.Count(token => resumeTokens.Contains(token));
        return Math.Round(matches / (double)jobTokens.Count * 100, 2, MidpointRounding.AwayFromZero);
    }

    private static IEnumerable<string> Normalize(string value)
    {
        var cleaned = Tokenizer.Replace(value.ToLowerInvariant(), " ");
        return cleaned
            .Split(' ', StringSplitOptions.RemoveEmptyEntries)
            .Select(token => token.Trim())
            .Where(token => token.Length > 0);
    }
}
