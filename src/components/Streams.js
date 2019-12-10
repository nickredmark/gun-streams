import React, { useEffect, useRef, useState } from "react";
import { getPub, qs, getId, getMd } from "nicks-gun-utils";
import ReactPlayer from "react-player";
import { Tweet } from "./Tweet";
import dragDrop from "drag-drop";

export const Streams = ({
  id,
  stream,
  priv,
  epriv,
  onSetStreamName,
  onUpdateMessage,
  onCreateMessage
}) => {
  const pub = getPub(id);
  const editable = !pub || !!priv;
  const [editing, setEditing] = useState(false);
  const [newName, setNewName] = useState("");
  const [md, setMd] = useState();

  const name =
    stream.name ||
    id.replace(`~${pub}.`, "").replace(`~${pub}`, "") ||
    "Stream";
  useEffect(() => {
    document.title = name;
  }, [name]);
  useEffect(() => {
    const hash = qs({ priv, epriv }, "#");
    setMd(getMd({ pub, hash }));
    if (priv) {
      dragDrop("body", async files => {
        for (const file of files) {
          const message = await toBase64(file);
          if (message.length > 1000000) {
            throw new Error(`File too large: ${message.length}`);
          }
          await onCreateMessage({
            text: message
          });
        }
      });
    }
  }, [priv]);

  if (!md) {
    return <div>Loading...</div>;
  }

  return (
    <>
      <header>
        {editing ? (
          <form
            onSubmit={e => {
              e.preventDefault();
              onSetStreamName(newName);
              setEditing(false);
            }}
          >
            <input
              autoFocus
              value={newName}
              onChange={e => setNewName(e.target.value)}
              placeholder="stream name"
            />
          </form>
        ) : (
          <h1
            className={editable ? "editable" : ""}
            onDoubleClick={
              editable &&
              (() => {
                setNewName(document.name);
                setEditing(true);
              })
            }
          >
            {(stream && stream.name) || "unnamed"}
            <a
              className="stream-permalink"
              href={`?id=${id}${qs({ epriv }, "#")}`}
              target="_blank"
              onClick={e => {
                e.preventDefault();
                navigator.clipboard.writeText(
                  `${location.origin}?id=${id}${qs({ epriv }, "#")}`
                );
                alert("Readonly URL copied to clipboard!");
              }}
            >
              #
            </a>
          </h1>
        )}
      </header>
      <main>
        <div className="content">
          {stream.messages.length === 0 && stream.lastMessage && (
            <div>Loading...</div>
          )}
          {stream.messages.map(message => {
            const id = getId(message);
            return (
              <MessageComponent
                key={id}
                id={id}
                message={message}
                editable={editable}
                onUpdateMessage={onUpdateMessage}
                md={md}
              />
            );
          })}
        </div>
      </main>
      {editable && <NewMessage onCreateMessage={onCreateMessage} />}
    </>
  );
};

const toBase64 = file =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = error => reject(error);
  });

const MessageComponent = ({ id, message, editable, onUpdateMessage, md }) => {
  const ref = useRef(null);
  useEffect(() => {
    ref.current.scrollIntoView();
  }, []);

  return (
    <div id={id} className="message" ref={ref}>
      <a id={id} />
      <MessageContent message={message} md={md} />
      <div className="message-meta">
        {editable && (
          <a
            href="#"
            className="message-permalink"
            style={{
              marginLeft: "0.25rem",
              color: "lightgray",
              textDecoration: "none",
              fontSize: "0.8rem"
            }}
            onClick={e => {
              e.preventDefault();
              onUpdateMessage(id, "highlighted", !message.highlighted);
            }}
          >
            !
          </a>
        )}
      </div>
    </div>
  );
};

export const MessageContent = ({ message, md }) => {
  if (/^data:image\//.exec(message.text)) {
    return <img src={message.text} />;
  }
  if (/^data:/.exec(message.text)) {
    return (
      <a href={message.text} target="_blank">
        [unknown attachment]
      </a>
    );
  }
  if (
    /^(https?:\/\/(www\.)?)?youtube\.com\/watch/.exec(message.text) ||
    /^(https?:\/\/(www\.)?)?youtu\.be\//.exec(message.text)
  ) {
    return (
      <div className="player-wrapper">
        <ReactPlayer
          className="react-player"
          url={message.text}
          width="100%"
          height="100%"
        />
      </div>
    );
  }
  if (/twitter.com\/\w+\/status\/\d+/.exec(message.text)) {
    return <Tweet url={message.text.split("/").pop()} />;
  }
  if (/^(\.+|-+|\*+|~+)$/.exec(message.text)) {
    return <hr />;
  }
  if (/^(https?:\/\/|www)/.exec(message.text)) {
    return (
      <a
        href={message.text}
        style={{
          color: "inherit"
        }}
        target="_blank"
      >
        {message.text}
      </a>
    );
  }

  return (
    <span
      style={{
        ...(message.highlighted && {
          fontWeight: "bold"
        })
      }}
      dangerouslySetInnerHTML={{ __html: md.render(message.text) }}
    />
  );
};

export const NewMessage = ({ onCreateMessage }) => {
  const text = useRef(null);
  return (
    <form
      onSubmit={async e => {
        e.preventDefault();
        onCreateMessage(text.current.value);
        text.current.value = "";
      }}
    >
      <input
        ref={text}
        placeholder="new thought"
        style={{
          width: "100%",
          padding: "1rem",
          borderRadius: "none",
          border: "none",
          borderTop: "1px solid lightgray"
        }}
      />
    </form>
  );
};
