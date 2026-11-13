namespace Zynerfilmer.Conexion.Api;
public sealed record Device(string Serial, string State, string Model);
public interface IAdb
{
    string Endpoint(string value);
    Task<Device[]> Enumerate(CancellationToken cancellation);
    Task Connect(string endpoint, CancellationToken cancellation);
    Task Disconnect(string endpoint, CancellationToken cancellation);
}
