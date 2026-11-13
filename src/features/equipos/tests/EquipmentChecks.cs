using Zynerfilmer.Equipos.Services;
namespace Zynerfilmer.Equipos.Tests;
internal static class EquipmentChecks
{
    public static async Task Run()
    {
        string directory = Path.Combine(Path.GetTempPath(), "zynerfilmer-check-" + Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(directory);
        string path = Path.Combine(directory, "equipos.json");
        try
        {
            var store = new EquipmentStore(path);
            if ((await store.Load(default)).Length != 0) throw new Exception("Missing catalog");
            await store.Save(["192.168.1.2:5555", "192.168.1.2:5555"], default);
            if ((await new EquipmentStore(path).Load(default)).Length != 1) throw new Exception("Persistence/deduplication");
            string original = await File.ReadAllTextAsync(path);
            using var cancelled = new CancellationTokenSource(); cancelled.Cancel();
            try { await store.Save(["192.168.1.3:5555"], cancelled.Token); throw new Exception("Cancellation ignored"); }
            catch (OperationCanceledException) { }
            if (await File.ReadAllTextAsync(path) != original || Directory.GetFiles(directory, "*.tmp").Length != 0) throw new Exception("Atomic save");
            await File.WriteAllTextAsync(path, "broken JSON");
            try { await store.Load(default); throw new Exception("Invalid JSON accepted"); }
            catch (IOException) { }
            if (await File.ReadAllTextAsync(path) != "broken JSON") throw new Exception("Corrupt catalog overwritten");
        }
        finally { foreach (var file in Directory.GetFiles(directory)) File.Delete(file); Directory.Delete(directory); }
    }
}
