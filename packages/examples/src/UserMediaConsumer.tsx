import { useMedia } from "@bengreenier/react-user-media";

export function UserMediaConsumer() {
  const state = useMedia("user");

  const { isError, isLoading, isReady, error, media, request } = state;

  return (
    <div>
      <button onClick={() => request({ audio: true, video: true })}>
        Request
      </button>
      <p>{isError}</p>
      {isError && (
        <p>
          {error.message} {error.stack}
        </p>
      )}
      <p>{isLoading}</p>
      <p>{isReady}</p>
      {isReady && (
        <p>
          {media.id}
          {" | "}
          {media
            .getTracks()
            .map((t) => `${t.kind}: ${t.label}`)
            .join(" | ")}
          <span
            onClick={(ev) => {
              ev.preventDefault();
              media.getTracks().forEach((track) => track.stop());
            }}
            style={{
              border: "2px solid white",
              padding: "2px 4px 2px 4px",
              cursor: "pointer",
            }}
          >
            X
          </span>
        </p>
      )}
    </div>
  );
}
