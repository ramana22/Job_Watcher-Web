using System.Text;
using UglyToad.PdfPig;

namespace JobWatcher.Api.Utility
{
    public static class PdfUtility
    {
        public static string ExtractPdfText(byte[] pdfBytes)
        {
            using var stream = new MemoryStream(pdfBytes);
            using var document = PdfDocument.Open(stream);

            var text = new StringBuilder();

            foreach (var page in document.GetPages())
            {
                text.AppendLine(page.Text);
            }

            return text.ToString();
        }
    }
}
