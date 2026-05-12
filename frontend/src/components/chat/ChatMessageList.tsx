interface ChatMessage {
  id: string;
  sender: 'bot' | 'user';
  text: string;
}

export default function ChatMessageList({ messages }: { messages: ChatMessage[] }) {
  return (
    <>
      {messages.map((message) => (
        <div key={message.id} className={`message ${message.sender}`}>
          {message.text}
        </div>
      ))}
    </>
  );
}
