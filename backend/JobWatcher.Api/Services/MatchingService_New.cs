using System.Text.RegularExpressions;

namespace JobWatcher.Api.Services
{
    public class MatchingService_New
    {
        private static readonly Regex Tokenizer =
            new("[^a-zA-Z0-9+#.\\s]", RegexOptions.Compiled);

        private static readonly HashSet<string> StopWords =
        [
            "and","or","the","a","an","with","for","to","of","in","on","at","by"
        ];


     //   MatchingService
     //│
     //├── Fast TF-IDF Score
     //│
     //└── AI Semantic Score(Azure OpenAI)
     //       │
     //       ▼
     //   Final Score


        public double CalculateScore(string resumeText, string jobText)
        {
            var resumeTokens = Normalize(resumeText).ToList();
            var jobTokens = Normalize(jobText).ToList();

            if (!resumeTokens.Any() || !jobTokens.Any())
                return 0;

            var vocabulary = resumeTokens
                .Union(jobTokens)
                .Distinct()
                .ToList();

            var resumeVector = BuildVector(resumeTokens, vocabulary);
            var jobVector = BuildVector(jobTokens, vocabulary);

            var similarity = CosineSimilarity(resumeVector, jobVector);

            return Math.Round(similarity * 100, 2);
        }

        private static Dictionary<string, double> BuildVector(
            List<string> tokens,
            List<string> vocabulary)
        {
            var tf = tokens
                .GroupBy(t => t)
                .ToDictionary(g => g.Key, g => g.Count() / (double)tokens.Count);

            var vector = new Dictionary<string, double>();

            foreach (var word in vocabulary)
            {
                tf.TryGetValue(word, out var value);
                vector[word] = value;
            }

            return vector;
        }

        private static double CosineSimilarity(
            Dictionary<string, double> v1,
            Dictionary<string, double> v2)
        {
            double dot = 0;
            double mag1 = 0;
            double mag2 = 0;

            foreach (var key in v1.Keys)
            {
                var a = v1[key];
                var b = v2[key];

                dot += a * b;
                mag1 += a * a;
                mag2 += b * b;
            }

            if (mag1 == 0 || mag2 == 0)
                return 0;

            return dot / (Math.Sqrt(mag1) * Math.Sqrt(mag2));
        }

        private static IEnumerable<string> Normalize(string value)
        {
            var cleaned = Tokenizer.Replace(value.ToLowerInvariant(), " ");

            return cleaned
                .Split(' ', StringSplitOptions.RemoveEmptyEntries)
                .Where(token => token.Length > 1 && !StopWords.Contains(token));
        }
    }
}
