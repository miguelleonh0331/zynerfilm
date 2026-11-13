namespace Zynerfilmer.Sesiones.Api;
public interface ISessions
{
    event Action<string>? StatusChanged;
    bool IsOpen(string endpoint);
    Task Open(string endpoint, CancellationToken cancellation);
    Task Close(string endpoint);
    Task CloseAll();
}
