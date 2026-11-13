using System.Diagnostics;
using System.Net;
using System.Text;
using Zynerfilmer.Conexion.Api;
namespace Zynerfilmer.Conexion.Services;
internal sealed class AdbService(string folder) : IAdb
{
    ProcessStartInfo StartInfo(IEnumerable<string> args)
    {
        var info = new ProcessStartInfo(Path.Combine(folder, "adb.exe")) { UseShellExecute = false, CreateNoWindow = true, RedirectStandardOutput = true, RedirectStandardError = true, WorkingDirectory = folder, StandardOutputEncoding = Encoding.UTF8, StandardErrorEncoding = Encoding.UTF8 };
        foreach (var arg in args) info.ArgumentList.Add(arg);
        info.Environment.Remove("ANDROID_SERIAL");
        return info;
    }
    public string Endpoint(string value)
    {
        value = value.Trim();
        int split = value.LastIndexOf(':');
        if (split <= 0 || !IPAddress.TryParse(value[..split].Trim('[', ']'), out var ip) || !int.TryParse(value[(split + 1)..], out int port) || port is < 1 or > 65535)
            throw new IOException("Usa una dirección IP y puerto, por ejemplo 192.168.1.20:5555.");
        return ip.AddressFamily == System.Net.Sockets.AddressFamily.InterNetworkV6 ? $"[{ip}]:{port}" : $"{ip}:{port}";
    }
    public static Device[] ParseDevices(string text) => text.Split('\n').Select(line => line.Trim()).Where(line => line.Length > 0 && !line.StartsWith("List of devices", StringComparison.Ordinal) && !line.StartsWith('*')).Select(line =>
    {
        string[] parts = line.Split((char[]?)null, StringSplitOptions.RemoveEmptyEntries);
        if (parts.Length < 2 || parts[1] is not ("device" or "offline" or "unauthorized")) return null;
        string model = parts.FirstOrDefault(p => p.StartsWith("model:"))?[6..].Replace('_', ' ') ?? "Android";
        return new Device(parts[0], parts[1], model);
    }).OfType<Device>().ToArray();
    async Task<(int ExitCode, string Output)> Run(string[] args, CancellationToken cancellation, int timeoutSeconds = 15)
    {
        using var deadline = CancellationTokenSource.CreateLinkedTokenSource(cancellation);
        deadline.CancelAfter(TimeSpan.FromSeconds(timeoutSeconds));
        using var process = Process.Start(StartInfo(args)) ?? throw new IOException("No se pudo iniciar " + "ADB");
        Task<string> stdout = process.StandardOutput.ReadToEndAsync(), stderr = process.StandardError.ReadToEndAsync();
        try { await process.WaitForExitAsync(deadline.Token); }
        catch (OperationCanceledException)
        {
            try { if (!process.HasExited) process.Kill(true); } catch (InvalidOperationException) { }
            await process.WaitForExitAsync();
            await Task.WhenAll(stdout, stderr);
            cancellation.ThrowIfCancellationRequested();
            throw new IOException("La operación agotó el tiempo de espera.");
        }
        return (process.ExitCode, (await stdout) + (await stderr));
    }

    public async Task<Device[]> Enumerate(CancellationToken cancellation)
    {
        var reply = await Run(["devices", "-l"], cancellation);
        if (reply.ExitCode != 0) throw new IOException("No se pudo consultar ADB.");
        return ParseDevices(reply.Output);
    }
    public async Task Connect(string endpoint, CancellationToken cancellation)
    {
        endpoint = Endpoint(endpoint);
        var reply = await Run(["connect", endpoint], cancellation);
        if (reply.ExitCode != 0 || !reply.Output.Contains("connected to", StringComparison.OrdinalIgnoreCase))
            throw new IOException("No se pudo conectar. Revisa IP, puerto y vinculacion ADB.");
        if (!(await Enumerate(cancellation)).Any(d => d.Serial == endpoint && d.State == "device"))
            throw new IOException("Equipo offline o sin autorizar. Revisa la depuracion inalambrica.");
    }
    public async Task Disconnect(string endpoint, CancellationToken cancellation)
    {
        var reply = await Run(["disconnect", Endpoint(endpoint)], cancellation);
        if (reply.ExitCode != 0) throw new IOException("No se pudo desconectar el equipo.");
    }
}
