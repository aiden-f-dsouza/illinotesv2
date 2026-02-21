// ============================================
// AI TUTOR CHAT WIDGET
// Dependencies: notes-page.js (getCSRFToken, showToast, escapeHtml)
// ============================================

(function () {
  'use strict';

  // === STATE ===
  let conversationHistory = []; // Session-only, resets on refresh
  let isWaitingForResponse = false;
  let attachedFile = null; // File object or null

  // === DOM REFERENCES ===
  let chatWidget, chatPanel, chatToggle, chatMessages, chatInput;
  let chatSendBtn, chatClearBtn, chatMinimizeBtn;
  let chatFileBtn, chatFileInput, chatFileBar, chatFileName, chatFileClear;

  // === INITIALIZATION ===
  function initAIChat() {
    chatWidget = document.getElementById('ai-chat-widget');
    if (!chatWidget) return; // Not rendered (user not logged in)

    chatPanel = document.getElementById('ai-chat-panel');
    chatToggle = document.getElementById('ai-chat-toggle');
    chatMessages = document.getElementById('ai-chat-messages');
    chatInput = document.getElementById('ai-chat-input');
    chatSendBtn = document.getElementById('ai-chat-send');
    chatClearBtn = document.getElementById('ai-chat-clear');
    chatMinimizeBtn = document.getElementById('ai-chat-minimize');
    chatFileBtn = document.getElementById('ai-chat-file-btn');
    chatFileInput = document.getElementById('ai-chat-file-input');
    chatFileBar = document.getElementById('ai-chat-file-bar');
    chatFileName = document.getElementById('ai-chat-file-name');
    chatFileClear = document.getElementById('ai-chat-file-clear');

    // Event listeners
    chatToggle.addEventListener('click', toggleChatPanel);
    chatSendBtn.addEventListener('click', sendMessage);
    chatClearBtn.addEventListener('click', clearChat);
    chatMinimizeBtn.addEventListener('click', toggleChatPanel);
    chatFileBtn.addEventListener('click', function () { chatFileInput.click(); });
    chatFileInput.addEventListener('change', selectFile);
    chatFileClear.addEventListener('click', clearFile);

    chatInput.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    });
  }

  // === FILE ATTACHMENT ===
  function selectFile() {
    var file = chatFileInput.files[0];
    if (!file) return;
    attachedFile = file;
    chatFileName.textContent = file.name;
    chatFileBar.style.display = 'flex';
  }

  function clearFile() {
    attachedFile = null;
    chatFileInput.value = '';
    chatFileBar.style.display = 'none';
  }

  // === PANEL TOGGLE ===
  function toggleChatPanel() {
    chatWidget.classList.toggle('open');
    if (chatWidget.classList.contains('open')) {
      chatToggle.innerHTML = '<i class="ph ph-x"></i>';
      chatInput.focus();
    } else {
      chatToggle.innerHTML = '<i class="ph ph-robot"></i>';
    }
  }

  // === SEND MESSAGE ===
  async function sendMessage() {
    var message = chatInput.value.trim();
    if ((!message && !attachedFile) || isWaitingForResponse) return;

    // Add user message to UI (include filename if a file is attached)
    var userBubble = escapeHtml(message);
    if (attachedFile) {
      userBubble += '<br><small class="ai-chat-file-label"><i class="ph ph-paperclip"></i> ' +
        escapeHtml(attachedFile.name) + '</small>';
    }
    addMessage('user', userBubble);
    chatInput.value = '';
    isWaitingForResponse = true;
    chatSendBtn.disabled = true;
    chatInput.disabled = true;

    // Show typing indicator
    showTypingIndicator();

    var fileToSend = attachedFile;

    try {
      var response;
      if (fileToSend) {
        var formData = new FormData();
        formData.append('message', message);
        formData.append('conversation_history', JSON.stringify(conversationHistory));
        formData.append('file', fileToSend);

        response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'X-CSRFToken': getCSRFToken() }, // NO Content-Type — browser sets multipart boundary
          body: formData
        });
      } else {
        response = await fetch('/api/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCSRFToken()
          },
          body: JSON.stringify({
            message: message,
            conversation_history: conversationHistory
          })
        });
      }

      removeTypingIndicator();

      if (response.status === 429) {
        addMessage('assistant', "You've reached the daily message limit (30/day). Try again tomorrow!");
        showToast('Daily chat limit reached', 'error');
        return;
      }

      if (!response.ok) {
        var errorData = await response.json().catch(function () { return {}; });
        throw new Error(errorData.error || 'Failed to get response');
      }

      var data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Unknown error');
      }

      addMessage('assistant', formatMarkdown(data.reply));

    } catch (error) {
      removeTypingIndicator();
      console.error('AI chat error:', error);
      addMessage('assistant', "Sorry, I couldn't process that. Please try again.");
      showToast('AI chat error: ' + error.message, 'error');
    } finally {
      isWaitingForResponse = false;
      chatSendBtn.disabled = false;
      chatInput.disabled = false;
      chatInput.focus();
      clearFile(); // Always clear file after send
    }
  }

  // === MESSAGE RENDERING ===
  function addMessage(role, htmlContent) {
    var msgDiv = document.createElement('div');
    msgDiv.className = 'ai-chat-message ai-chat-message-' + role;
    msgDiv.innerHTML = '<div class="ai-chat-message-content">' + htmlContent + '</div>';
    chatMessages.appendChild(msgDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;

    // Track in conversation history (plain text for API)
    conversationHistory.push({
      role: role,
      content: msgDiv.textContent
    });
  }

  function showTypingIndicator() {
    var indicator = document.createElement('div');
    indicator.id = 'ai-typing-indicator';
    indicator.className = 'ai-chat-message ai-chat-message-assistant';
    indicator.innerHTML =
      '<div class="ai-chat-typing">' +
      '<span></span><span></span><span></span>' +
      '</div>';
    chatMessages.appendChild(indicator);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  function removeTypingIndicator() {
    var indicator = document.getElementById('ai-typing-indicator');
    if (indicator) indicator.remove();
  }

  // === CLEAR CHAT ===
  function clearChat() {
    if (!confirm('Clear chat history?')) return;
    conversationHistory = [];
    chatMessages.innerHTML =
      '<div class="ai-chat-message ai-chat-message-assistant">' +
      '<div class="ai-chat-message-content">' +
      '<p>Chat cleared. Ask me anything!</p>' +
      '</div></div>';
  }

  // === MARKDOWN FORMATTING ===
  function formatMarkdown(text) {
    var html = escapeHtml(text);

    // Code blocks
    html = html.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');
    // Inline code
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
    // Bold
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    // Italic
    html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
    // Unordered lists
    html = html.replace(/^- (.+)$/gm, '<li>$1</li>');
    // Line breaks
    html = html.replace(/\n/g, '<br>');

    return html;
  }

  // === INIT ON DOM READY ===
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAIChat);
  } else {
    initAIChat();
  }
})();
