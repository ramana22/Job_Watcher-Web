using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace JobWatcher.Api.Models;

public class Resume
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Column("filename")]
    public string Filename { get; set; } = string.Empty;

    [Column("content")]
    public byte[] Content { get; set; } = Array.Empty<byte>();

    [Column("text_content")]
    public string TextContent { get; set; } = string.Empty;

    [Column("uploaded_at")]
    public DateTime UploadedAt { get; set; } = DateTime.UtcNow;
}
