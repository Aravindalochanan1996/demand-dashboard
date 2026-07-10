import React, { useEffect, useRef, useState } from "react";
import api from "../api";
import ModuleNav from "../components/ModuleNav";
import Navbar from "../components/Navbar";

export default function ResumeAnalyzer() {
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [showModuleNav, setShowModuleNav] = useState(true);
  const [messages, setMessages] = useState([
    {
      role: "bot",
      text: "Upload one or more resume PDFs, then ask me things like \"which resumes have Java microservices and prompt engineering skills?\"",
    },
  ]);
  const [question, setQuestion] = useState("");
  const [asking, setAsking] = useState(false);
  const fileInputRef = useRef(null);
  const scrollRef = useRef(null);

  const loadFiles = async () => {
    const res = await api.get("/api/resume-analyzer/files");
    setFiles(res.data);
  };

  useEffect(() => {
    loadFiles();
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const handleUpload = async (e) => {
    const picked = Array.from(e.target.files || []);
    if (picked.length === 0) return;
    setUploading(true);
    try {
      const formData = new FormData();
      picked.forEach((f) => formData.append("files", f));
      await api.post("/api/resume-analyzer/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      await loadFiles();
      setMessages((m) => [
        ...m,
        { role: "bot", text: `Added ${picked.length} resume(s). You now have ${files.length + picked.length} loaded.` },
      ]);
    } catch (err) {
      setMessages((m) => [...m, { role: "bot", text: `Upload failed: ${err.response?.data?.detail || err.message}` }]);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const removeFile = async (id) => {
    await api.delete(`/api/resume-analyzer/files/${id}`);
    loadFiles();
  };

  const handleAsk = async (e) => {
    e.preventDefault();
    if (!question.trim()) return;
    const q = question.trim();
    setMessages((m) => [...m, { role: "user", text: q }]);
    setQuestion("");
    setAsking(true);
    try {
      const res = await api.post("/api/resume-analyzer/ask", { question: q, file_ids: [] });
      setMessages((m) => [...m, { role: "bot", text: res.data.answer }]);
    } catch (err) {
      setMessages((m) => [
        ...m,
        { role: "bot", text: err.response?.data?.detail || "Something went wrong answering that." },
      ]);
    } finally {
      setAsking(false);
    }
  };

  return (
    <div className="dashboard-layout">
      <Navbar onToggleMenu={() => setShowModuleNav((v) => !v)} menuOpen={showModuleNav} />
      <div className="dashboard-body">
        <div className={"module-nav-wrap" + (showModuleNav ? " open" : "")}>
          <ModuleNav />
        </div>
        {showModuleNav && <div className="module-nav-overlay" onClick={() => setShowModuleNav(false)} />}
        <main className="dashboard-content resume-analyzer-content">
          <h2>Resume Analyzer</h2>
          <p className="subtitle">Upload resumes, then chat with them to find the right candidates.</p>

          <div className="resume-analyzer-grid">
            <div className="card-form">
              <h3>Uploaded resumes</h3>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf"
                multiple
                onChange={handleUpload}
                disabled={uploading}
              />
              {uploading && <p className="subtitle">Uploading & extracting text...</p>}
              <ul className="file-list">
                {files.map((f) => (
                  <li key={f.id}>
                    <span>{f.candidate_name}</span>
                    <button className="btn text small" onClick={() => removeFile(f.id)}>
                      ×
                    </button>
                  </li>
                ))}
                {files.length === 0 && <p className="empty-note">No resumes uploaded yet</p>}
              </ul>
            </div>

            <div className="chat-panel">
              <div className="chat-messages" ref={scrollRef}>
                {messages.map((m, i) => (
                  <div key={i} className={`chat-bubble ${m.role}`}>
                    {m.text}
                  </div>
                ))}
                {asking && <div className="chat-bubble bot typing">Thinking…</div>}
              </div>
              <form className="chat-input-row" onSubmit={handleAsk}>
                <input
                  placeholder="Ask about the uploaded resumes..."
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  disabled={asking}
                />
                <button className="btn primary" type="submit" disabled={asking || !question.trim()}>
                  Send
                </button>
              </form>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
