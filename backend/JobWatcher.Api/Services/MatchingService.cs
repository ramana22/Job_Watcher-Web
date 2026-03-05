using System.Text.RegularExpressions;

namespace JobWatcher.Api.Services;

public class MatchingService
{
    private static readonly Regex Tokenizer =
        new("[^a-zA-Z0-9\\s]", RegexOptions.Compiled);

    private static readonly HashSet<string> StopWords = new(StringComparer.OrdinalIgnoreCase)
    {
        "and","or","the","a","an","with","for","to","of","in","on","at","by"
    };

    public double CalculateScore(string? resumeText, params string?[] jobFields)
    {
        if (string.IsNullOrWhiteSpace(resumeText))
            return 0;

        var resumeTokens = Normalize(resumeText).ToHashSet();

        if (resumeTokens.Count == 0)
            return 0;

        var jobTokens = jobFields
            .Where(field => !string.IsNullOrWhiteSpace(field))
            .SelectMany(field => Normalize(field!))
            .ToHashSet();

        if (jobTokens.Count == 0)
            return 0;

        var matches = jobTokens.Count(token => resumeTokens.Contains(token));

        var score = matches / (double)jobTokens.Count * 100;

        return Math.Round(score, 2, MidpointRounding.AwayFromZero);
    }

    private static IEnumerable<string> Normalize(string value)
    {
        var cleaned = Tokenizer.Replace(value.ToLowerInvariant(), " ");

        return cleaned
            .Split(' ', StringSplitOptions.RemoveEmptyEntries)
            .Select(token => token.Trim())
            .Where(token => token.Length > 1 && !StopWords.Contains(token));
    }
}