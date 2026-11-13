using Zynerfilmer.Conexion.Api;
using Zynerfilmer.Equipos.Api;
using Zynerfilmer.Sesiones.Api;
namespace Zynerfilmer.Panel.Api;
internal sealed partial class Panel : Form
{
    readonly TextBox ip = new() { Width = 220, PlaceholderText = "192.168.1.20" };
    readonly NumericUpDown port = new() { Minimum = 1, Maximum = 65535, Value = 5555, Width = 100 };
    readonly Button add = new() { Text = "Agregar", AutoSize = true };
    readonly Button refresh = new() { Text = "Actualizar estados", AutoSize = true };
    readonly Button control = new() { Text = "Controlar", AutoSize = true };
    readonly Button disconnect = new() { Text = "Desconectar", AutoSize = true };
    readonly ListView list = new() { Dock = DockStyle.Fill, View = View.Details, FullRowSelect = true, MultiSelect = false, HideSelection = false };
    readonly Label status = new() { Text = "Agrega un equipo para comenzar.", AutoSize = true, Padding = new Padding(0, 10, 0, 10) };
    readonly IAdb adb;
    readonly IEquipmentStore store;
    readonly ISessions sessions;
    readonly HashSet<string> saved = new(StringComparer.OrdinalIgnoreCase);
    readonly CancellationTokenSource lifetime = new();
    bool catalogReady;
    bool busy;
    bool closing;

    public Panel(IAdb adb, IEquipmentStore store, ISessions sessions, bool smoke)
    {
        this.adb = adb; this.store = store; this.sessions = sessions;
        sessions.StatusChanged += OnSessionStatus;
        Text = "Zynerfilmer";
        Font = new Font("Segoe UI", 11);
        Size = new Size(850, 560);
        MinimumSize = new Size(720, 440);
        StartPosition = FormStartPosition.CenterScreen;
        var root = new TableLayoutPanel { Dock = DockStyle.Fill, Padding = new Padding(24), ColumnCount = 1, RowCount = 6 };
        root.RowStyles.Add(new RowStyle(SizeType.AutoSize));
        root.RowStyles.Add(new RowStyle(SizeType.AutoSize));
        root.RowStyles.Add(new RowStyle(SizeType.AutoSize));
        root.RowStyles.Add(new RowStyle(SizeType.Percent, 100));
        root.RowStyles.Add(new RowStyle(SizeType.AutoSize));
        root.RowStyles.Add(new RowStyle(SizeType.AutoSize));
        root.Controls.Add(new Label { Text = "Zynerfilmer", Font = new Font("Segoe UI", 24, FontStyle.Bold), AutoSize = true });
        root.Controls.Add(new Label { Text = "Control de Android por Wi-Fi · ADB + scrcpy", AutoSize = true, Margin = new Padding(0, 4, 0, 18) });
        root.Controls.Add(Row(new Label { Text = "IP", AutoSize = true }, ip, new Label { Text = "Puerto", AutoSize = true }, port, add));
        list.Columns.Add("Equipo", 220); list.Columns.Add("IP y puerto", 250); list.Columns.Add("Estado", 200);
        root.Controls.Add(list);
        root.Controls.Add(Row(control, refresh, disconnect));
        root.Controls.Add(status);
        Controls.Add(root);
        AcceptButton = add;
        add.Click += async (_, _) => await Operation(AddDevice);
        refresh.Click += async (_, _) => await Operation(RefreshDevices);
        control.Click += async (_, _) => await Operation(OpenScreen);
        disconnect.Click += async (_, _) => await Operation(Disconnect);
        list.DoubleClick += async (_, _) => await Operation(OpenScreen);
        FormClosing += async (_, e) =>
        {
            if (closing) return;
            e.Cancel = true; closing = true; lifetime.Cancel();
            sessions.StatusChanged -= OnSessionStatus;
            try { await sessions.CloseAll(); }
            finally { Close(); }
        };
        Shown += async (_, _) =>
        {
            await Operation(async () =>
            {
                var loaded = await store.Load(lifetime.Token);
                var validated = loaded.Select(adb.Endpoint).ToArray();
                saved.UnionWith(validated);
                catalogReady = true;
                await RefreshDevices();
            });
            if (smoke) { await Task.Delay(500); Close(); }
        };
    }
    static FlowLayoutPanel Row(params Control[] controls)
    {
        var row = new FlowLayoutPanel { AutoSize = true, Dock = DockStyle.Fill, Padding = new Padding(0, 8, 0, 8) };
        row.Controls.AddRange(controls); return row;
    }
    async Task Operation(Func<Task> action)
    {
        if (busy || closing) return;
        busy = true; add.Enabled = refresh.Enabled = control.Enabled = disconnect.Enabled = false;
        try { await action(); }
        catch (OperationCanceledException) { }
        catch (Exception error) { if (!closing) status.Text = error.Message; }
        finally { busy = false; if (!closing) add.Enabled = refresh.Enabled = control.Enabled = disconnect.Enabled = true; }
    }
    string Selected() => list.SelectedItems.Count == 1 ? list.SelectedItems[0].Name : throw new IOException("Selecciona un equipo.");
    async Task AddDevice()
    {
        if (!catalogReady) throw new IOException("No se pudo cargar el catalogo. Corrige el archivo antes de agregar equipos.");
        string target = adb.Endpoint($"{ip.Text.Trim()}:{port.Value}");
        status.Text = "Conectando…";
        await adb.Connect(target, lifetime.Token);
        var updated = saved.Append(target).Distinct(StringComparer.OrdinalIgnoreCase).ToArray();
        await store.Save(updated, lifetime.Token);
        saved.Add(target);
        await RefreshDevices();
        foreach (ListViewItem item in list.Items) item.Selected = item.Name == target;
        status.Text = "Equipo agregado. Pulsa Controlar para abrir su pantalla.";
    }
    async Task RefreshDevices()
    {
        var devices = await adb.Enumerate(lifetime.Token);
        string? selected = list.SelectedItems.Count > 0 ? list.SelectedItems[0].Name : null;
        list.Items.Clear();
        foreach (string endpoint in saved.Order())
        {
            var device = devices.FirstOrDefault(d => d.Serial == endpoint);
            string state = device?.State switch { "device" => "Conectado", "unauthorized" => "Sin autorizar", "offline" => "Offline", _ => "Desconectado" };
            var item = new ListViewItem([device?.Model ?? "Android", endpoint, state]) { Name = endpoint, Selected = endpoint == selected };
            list.Items.Add(item);
        }
        status.Text = $"{saved.Count} equipo(s) guardado(s).";
    }
    void OnSessionStatus(string message)
    {
        if (!closing && !IsDisposed) status.Text = message;
    }
    async Task OpenScreen()
    {
        string target = Selected();
        await sessions.Open(target, lifetime.Token);
        status.Text = "Abriendo pantalla de " + target;
    }
    async Task Disconnect()
    {
        string target = Selected();
        await sessions.Close(target);
        await adb.Disconnect(target, lifetime.Token);
        await RefreshDevices();
    }
}
