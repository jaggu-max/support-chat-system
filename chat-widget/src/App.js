// chat-widget/src/App.js

import React from 'react';
import ChatWidget from './ChatWidget'; // <-- Import the Chat Widget component
import './App.css'; 

function App() {
  return (
    <div className="App">
      {/* This is the main application area where a website owner would
        put their content. The ChatWidget is placed at the bottom.
      */}
      <h1>Welcome to the Demo Website!</h1>
      <p>This is where your regular website content would go.</p>
      <p>The Chat Widget is embedded below.</p>
      
      {/* RENDER THE CHAT WIDGET */}
      <ChatWidget websiteId="my-ecommerce-site-1" />
    </div>
  );
}

export default App;