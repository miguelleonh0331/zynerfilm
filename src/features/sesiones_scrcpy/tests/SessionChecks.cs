using Zynerfilmer.Conexion.Api;
using Zynerfilmer.Sesiones.Services;
namespace Zynerfilmer.Sesiones.Tests;
internal static class SessionChecks
{
    sealed class RejectedAdb : IAdb
    {
        public int Connections;
        public string Endpoint(string value) => value;
        public Task<Device[]> Enumerate(CancellationToken cancellation) => Task.FromResult(Array.Empty<Device>());
        public Task Connect(string endpoint, CancellationToken cancellation) { Connections++; throw new IOException("Unauthorized"); }
        public Task Disconnect(string endpoint, CancellationToken cancellation) => Task.CompletedTask;
    }
    public static async Task Run()
    {
        var adb = new RejectedAdb();
        var sessions = new ScrcpySessions(adb, "missing-engine");
        try { await sessions.Open("192.168.1.2:5555", default); throw new Exception("Unauthorized accepted"); }
        catch (IOException) { }
        if (adb.Connections != 1 || sessions.IsOpen("192.168.1.2:5555")) throw new Exception("Session reserved without authorization");
        await sessions.Close("unknown");
        await sessions.CloseAll();
        var args = ScrcpySessions.Arguments("192.168.1.2:5555");
        if (args[0] != "--serial" || args[1] != "192.168.1.2:5555" || !args.Contains("--no-audio") || args.Contains("--no-control")) throw new Exception("Scrcpy arguments");
    }
}
