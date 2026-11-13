using System.Text.Json;
using Zynerfilmer.Equipos.Api;
namespace Zynerfilmer.Equipos.Services;
internal sealed class EquipmentStore(string path) : IEquipmentStore
{
    static string[] Unique(IEnumerable<string> entries)
    {
        var values = entries.ToArray();
        if (values.Any(string.IsNullOrWhiteSpace)) throw new IOException("Catalogo con entradas vacias.");
        return values.Distinct(StringComparer.OrdinalIgnoreCase).Order().ToArray();
    }
    public async Task<string[]> Load(CancellationToken cancellation)
    {
        if (!File.Exists(path)) return [];
        try
        {
            return Unique(JsonSerializer.Deserialize<string[]>(await File.ReadAllTextAsync(path, cancellation))
                ?? throw new IOException("Catalogo invalido; no se ha modificado."));
        }
        catch (JsonException error) { throw new IOException("Catalogo JSON invalido; no se ha modificado.", error); }
    }
    public async Task Save(IEnumerable<string> endpoints, CancellationToken cancellation)
    {
        var values = Unique(endpoints);
        Directory.CreateDirectory(Path.GetDirectoryName(Path.GetFullPath(path))!);
        string temporary = path + "." + Guid.NewGuid().ToString("N") + ".tmp";
        try
        {
            await File.WriteAllTextAsync(temporary, JsonSerializer.Serialize(values), cancellation);
            cancellation.ThrowIfCancellationRequested();
            File.Move(temporary, path, true);
        }
        finally { if (File.Exists(temporary)) File.Delete(temporary); }
    }
}
