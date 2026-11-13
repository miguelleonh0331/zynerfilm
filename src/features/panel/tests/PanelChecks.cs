using Zynerfilmer.Conexion.Api;
using Zynerfilmer.Equipos.Api;
using Zynerfilmer.Sesiones.Api;
namespace Zynerfilmer.Panel.Api;
internal sealed partial class Panel
{
    sealed class FakeAdb : IAdb
    {
        public bool Connected;
        public string Endpoint(string value) => value;
        public Task<Device[]> Enumerate(CancellationToken cancellation) =>
            Task.FromResult(Connected ? new[] { new Device("192.168.1.2:5555", "device", "Prueba") } : Array.Empty<Device>());
        public Task Connect(string endpoint, CancellationToken cancellation) { Connected = true; return Task.CompletedTask; }
        public Task Disconnect(string endpoint, CancellationToken cancellation) { Connected = false; return Task.CompletedTask; }
    }
    sealed class FakeStore : IEquipmentStore
    {
        public string[] Values = [];
        public bool FailSave;
        public Task<string[]> Load(CancellationToken cancellation) => Task.FromResult(Values);
        public Task Save(IEnumerable<string> endpoints, CancellationToken cancellation)
        {
            if (FailSave) throw new IOException("Escritura rechazada");
            Values = endpoints.ToArray(); return Task.CompletedTask;
        }
    }
    sealed class FakeSessions : ISessions
    {
        public bool Opened;
        public event Action<string>? StatusChanged;
        public bool IsOpen(string endpoint) => Opened;
        public Task Open(string endpoint, CancellationToken cancellation) { Opened = true; return Task.CompletedTask; }
        public Task Close(string endpoint) { Opened = false; StatusChanged?.Invoke("Pantalla cerrada."); return Task.CompletedTask; }
        public Task CloseAll() { Opened = false; return Task.CompletedTask; }
    }
    internal static Panel CreateFlowTest()
    {
        var adb = new FakeAdb(); var store = new FakeStore(); var sessions = new FakeSessions();
        var panel = new Panel(adb, store, sessions, false);
        panel.Shown += async (_, _) =>
        {
            try
            {
                await Task.Yield();
                panel.ip.Text = "192.168.1.2";
                panel.add.PerformClick();
                if (panel.busy || panel.list.Items.Count != 1 || store.Values.Length != 1) throw new Exception("Agregar no actualizo catalogo y lista.");
                panel.list.Items[0].Selected = true;
                panel.control.PerformClick();
                if (!sessions.Opened) throw new Exception("Controlar no abrio sesion.");
                panel.disconnect.PerformClick();
                if (sessions.Opened || adb.Connected || panel.list.Items[0].SubItems[2].Text != "Desconectado") throw new Exception("Desconectar no cerro y actualizo estado.");
                store.FailSave = true;
                panel.ip.Text = "192.168.1.3";
                panel.add.PerformClick();
                if (panel.saved.Count != 1 || store.Values.Length != 1 || panel.status.Text != "Escritura rechazada") throw new Exception("Fallo de guardado altero catalogo.");
            }
            catch (Exception error)
            {
                File.WriteAllText(Path.Combine(Path.GetTempPath(), "zynerfilmer-ui-test-error.txt"), error.ToString());
                Environment.ExitCode = 1;
            }
            finally { panel.Close(); }
        };
        return panel;
    }
}
