using Zynerfilmer.Conexion.Services;
using Zynerfilmer.Equipos.Services;
using Zynerfilmer.Sesiones.Services;
using Zynerfilmer.Panel.Api;
namespace Zynerfilmer;
internal static class Program
{
    [STAThread]
    static void Main(string[] args)
    {
        ApplicationConfiguration.Initialize();
        if (args.Contains("--self-test"))
        {
            try { SelfChecks.Run().GetAwaiter().GetResult(); }
            catch (Exception error) { File.WriteAllText(Path.Combine(Path.GetTempPath(), "zynerfilmer-test-error.txt"), error.ToString()); Environment.ExitCode = 1; }
            return;
        }
        if (args.Contains("--ui-test")) { Application.Run(Zynerfilmer.Panel.Api.Panel.CreateFlowTest()); return; }
        string folder = Path.Combine(AppContext.BaseDirectory, "motor");
        string settings = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "Zynerfilmer", "equipos.json");
        var adb = new AdbService(folder);
        var store = new EquipmentStore(settings);
        var sessions = new ScrcpySessions(adb, folder);
        Application.Run(new Zynerfilmer.Panel.Api.Panel(adb, store, sessions, args.Contains("--smoke")));
    }
}
