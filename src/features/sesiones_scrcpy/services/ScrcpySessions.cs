using System.Diagnostics;
using System.Text;
using Zynerfilmer.Conexion.Api;
using Zynerfilmer.Sesiones.Api;
namespace Zynerfilmer.Sesiones.Services;
// Called from the UI synchronization context; one owner serializes Open/Close.
internal sealed class ScrcpySessions(IAdb adb, string folder) : ISessions
{
    readonly Dictionary<string, (Process Process, Task Completion)> sessions = new();
    public event Action<string>? StatusChanged;
    public bool IsOpen(string endpoint) => sessions.ContainsKey(endpoint);
    internal static string[] Arguments(string endpoint) =>
        ["--serial", endpoint, "--window-title=Zynerfilmer - " + endpoint,
         "--max-size=1280", "--max-fps=60", "--video-bit-rate=8M", "--no-audio"];
    public async Task Open(string endpoint, CancellationToken cancellation)
    {
        endpoint = adb.Endpoint(endpoint);
        if (IsOpen(endpoint)) throw new IOException("La pantalla de este equipo ya esta abierta.");
        await adb.Connect(endpoint, cancellation);
        cancellation.ThrowIfCancellationRequested();
        var info = new ProcessStartInfo(Path.Combine(folder, "scrcpy.exe")) {
            UseShellExecute = false, CreateNoWindow = true, RedirectStandardOutput = true,
            RedirectStandardError = true, WorkingDirectory = folder,
            StandardOutputEncoding = Encoding.UTF8, StandardErrorEncoding = Encoding.UTF8 };
        foreach (var argument in Arguments(endpoint)) info.ArgumentList.Add(argument);
        info.Environment.Remove("ANDROID_SERIAL");
        info.Environment.Remove("SCRCPY_SERVER_PATH");
        info.Environment["ADB"] = Path.Combine(folder, "adb.exe");
        var process = Process.Start(info) ?? throw new IOException("No se pudo abrir scrcpy.");
        // Reserve before observing a process that may exit immediately.
        sessions.Add(endpoint, (process, Task.CompletedTask));
        var completion = Watch(endpoint, process);
        if (sessions.ContainsKey(endpoint)) sessions[endpoint] = (process, completion);
    }
    async Task Watch(string endpoint, Process process)
    {
        try
        {
            var stdout = process.StandardOutput.ReadToEndAsync();
            var stderr = process.StandardError.ReadToEndAsync();
            await process.WaitForExitAsync();
            await Task.WhenAll(stdout, stderr);
            StatusChanged?.Invoke(process.ExitCode == 0 ? "Pantalla cerrada." : "scrcpy termino con error. Revisa la conexion del equipo.");
        }
        catch (Exception error) when (error is IOException or InvalidOperationException)
        { StatusChanged?.Invoke("Se interrumpio la sesion."); }
        finally { sessions.Remove(endpoint); process.Dispose(); }
    }
    public async Task Close(string endpoint)
    {
        if (!sessions.TryGetValue(endpoint, out var session)) return;
        try
        {
            if (!session.Process.HasExited)
            {
                session.Process.CloseMainWindow();
                try { await session.Process.WaitForExitAsync().WaitAsync(TimeSpan.FromSeconds(3)); }
                catch (TimeoutException) { if (!session.Process.HasExited) session.Process.Kill(true); }
            }
        }
        catch (InvalidOperationException) { }
        await session.Completion;
    }
    public async Task CloseAll()
    {
        await Task.WhenAll(sessions.Keys.ToArray().Select(Close));
    }
}
