import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  TextField,
  IconButton,
  Paper,
  AppBar,
  Toolbar,
  Typography,
  Box,
  CssBaseline,
  ThemeProvider,
  createTheme,
} from "@mui/material";
import SendIcon from "@mui/icons-material/Send";
import MicIcon from "@mui/icons-material/Mic";
import VolumeUpIcon from "@mui/icons-material/VolumeUp";
import LogoutIcon from "@mui/icons-material/Logout";
import SpellcheckIcon from "@mui/icons-material/Spellcheck";
import PersonIcon from "@mui/icons-material/Person";
import SmartToyIcon from "@mui/icons-material/SmartToy";
import HomeIcon from "@mui/icons-material/Home";
import PauseIcon from '@mui/icons-material/Pause';
import { ThreeDot } from "react-loading-indicators";
import { DotLoader, ScaleLoader } from "react-spinners";
import PaymentPage from "./pages/PaymentPage";

const ChatApp = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [grammarLoadingId, setGrammarLoadingId] = useState(null);
  const [isAILoading, setIsAILoading] = useState(false);
  const [micLoading, setMicLoading] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [speakingIndex, setSpeakingIndex] = useState(null);
  const [subscribePage, setSubscribePage] = useState(false);
  const chatEndRef = useRef(null);
  const synthRef = useRef(window.speechSynthesis);
  const utteranceRef = useRef(null);
  const navigate = useNavigate();

  // Themes
  const darkTheme = createTheme({
    palette: {
      mode: "dark",
      background: {
        default: "#121212",
        paper: "#1e1e1e",
      },
    },
  });

  const lightTheme = createTheme({
    palette: {
      mode: "light",
    },
  });

  const theme = isDarkMode ? darkTheme : lightTheme;

  // Auth headers helper
  const getAuthHeaders = () => {
    const token = localStorage.getItem("access");
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    };
  };

  // Load theme mode from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem("darkMode");
    if (saved) setIsDarkMode(saved === "true");
  }, []);

  // Save theme mode changes to localStorage
  useEffect(() => {
    localStorage.setItem("darkMode", isDarkMode);
  }, [isDarkMode]);

  // Load chat history on mount
  useEffect(() => {
    fetch("/chat/history/", { headers: getAuthHeaders() })
      .then((res) => res.json())
      .then((data) => {
        const formatted = [];
        data.forEach((item) => {
          formatted.push({
            id: item.message_id,
            is_user: true,
            text: item.user_message,
            corrected: item.corrected_message,
          });
          formatted.push({
            is_user: false,
            text: item.ai_response,
          });
        });
        setMessages(formatted);
      })
      .catch((e) => console.error("Failed to fetch chat history:", e));
  }, []);

  // Auto scroll chat to bottom on new message
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Send message handler
  const handleSend = async () => {
    if (!input.trim()) return;
    const tempId = Date.now();
    const newMessages = [...messages, { is_user: true, text: input, id: tempId }];
    setMessages(newMessages);
    setInput("");
    setIsAILoading(true);

    try {
      const res = await fetch("/chat/send/", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ text: input }),
      });
      if (!res.ok) throw new Error("Failed to send message");
      const data = await res.json();

      const updated = newMessages.map((msg) =>
        msg.id === tempId ? { ...msg, id: data.message_id } : msg
      );
      updated.push({ is_user: false, text: data.reply });
      setMessages(updated);
      speak(data.reply, updated.length - 1);
    } catch (error) {
      console.error("Error sending message:", error);
      // Optionally, add a user notification here
    } finally {
      setIsAILoading(false);
    }
  };

  // Speech synthesis
  const speak = (text, index) => {
    if (synthRef.current.speaking) synthRef.current.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.onend = () => setSpeakingIndex(null);
    utteranceRef.current = utterance;
    setSpeakingIndex(index);
    synthRef.current.speak(utterance);
  };

  const stopSpeaking = () => {
    if (synthRef.current.speaking) {
      synthRef.current.cancel();
      setSpeakingIndex(null);
    }
  };

  // Voice recognition
  const startVoiceRecognition = () => {
    setMicLoading(true);
    if (!("webkitSpeechRecognition" in window)) {
      alert("Voice recognition not supported in this browser.");
      setMicLoading(false);
      return;
    }

    try {
      const recognition = new window.webkitSpeechRecognition();
      recognition.lang = "en-US";
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setInput(transcript);
      };

      recognition.onerror = (event) => {
        console.error("Speech recognition error:", event.error);
        setMicLoading(false);
      };

      recognition.onend = () => {
        setMicLoading(false);
      };

      recognition.start();
    } catch (error) {
      console.error("Voice recognition failed:", error);
      setMicLoading(false);
    }
  };

  // Grammar check for user message
  const handleCheckGrammar = async (message_id, index) => {
    if (!message_id) return;

    try {
      setGrammarLoadingId(message_id);
      const res = await fetch("/chat/grammar-check/", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ message_id }),
      });
      if (!res.ok) throw new Error("Grammar check failed");
      const data = await res.json();

      setMessages((prev) => {
        const updated = [...prev];
        updated[index] = { ...updated[index], corrected: data.corrected };
        return updated;
      });
    } catch (error) {
      console.error("Grammar check failed:", error);
    } finally {
      setGrammarLoadingId(null);
    }
  };

  // Logout handler
  const handleLogout = () => {
    fetch("/logout", { method: "POST", headers: getAuthHeaders() }).finally(() => {
      localStorage.clear();
      navigate("/login");
    });
  };

  // Subscription page toggle
  const handleSubscribe = () => {
    setSubscribePage(true);
  };

  const handleHome = () => {
    setSubscribePage(false);
    navigate("/");
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box
        sx={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          bgcolor: "background.default",
          color: "text.primary",
        }}
      >
        <AppBar position="static">
          <Toolbar>
            <Box
              component="img"
              src="/SmartChat-Logo.png"
              alt="Logo"
              sx={{ height: 40, mr: 2, borderRadius: "50%" }}
            />
            <Typography variant="h6" sx={{ flexGrow: 1, textAlign: "center" }}>
              SmartChat AI
            </Typography>

            {/* Subscribe / Home */}
            {!subscribePage ? (
              <Box
                component="button"
                onClick={handleSubscribe}
                sx={{
                  bgcolor: "#00C853",
                  color: "#fff",
                  border: "none",
                  borderRadius: 1,
                  px: 2,
                  py: 0.5,
                  fontWeight: "bold",
                  cursor: "pointer",
                  mr: 1,
                  fontSize: "0.875rem",
                }}
              >
                Subscribe Now
              </Box>
            ) : (
              <IconButton color="inherit" onClick={handleHome}>
                <HomeIcon fontSize="large" />
              </IconButton>
            )}
            
            {/* Mode Toggle */}
            <IconButton color="inherit" onClick={() => setIsDarkMode(!isDarkMode)}>
              {isDarkMode ? "🌙" : "☀️"}
            </IconButton>

            {/* Logout */}
            <IconButton color="inherit" onClick={handleLogout}>
              <LogoutIcon />
            </IconButton>
          </Toolbar>
        </AppBar>

        <Box
          sx={{
            flex: 1,
            display: "flex",
            justifyContent: "center",
            p: 2,
            bgcolor: "background.default",
          }}
        >
          {!subscribePage ? (
            <Paper
              elevation={8}
              sx={{
                width: "100%",
                maxWidth: 800,
                height: "85vh",
                display: "flex",
                flexDirection: "column",
                borderRadius: 2,
                p: 1,
                bgcolor: "background.paper",
                color: "text.primary",
              }}
            >
              <Box
                sx={{
                  flex: 1,
                  p: 2,
                  overflowY: "auto",
                }}
              >
                {messages.map((msg, i) => (
                  <Box
                    key={i}
                    sx={{
                      display: "flex",
                      justifyContent: msg.is_user ? "flex-end" : "flex-start",
                      mb: 1,
                      alignItems: "center",
                      gap: 1,
                      px: 1,
                    }}
                  >
                    {!msg.is_user && (
                      <SmartToyIcon
                        sx={{ color: "primary.main", fontSize: 32 }}
                        aria-label="AI"
                      />
                    )}

                    <Box
                      sx={{
                        bgcolor: msg.is_user ? "primary.main" : "grey.300",
                        color: msg.is_user ? "#fff" : "#000",
                        p: 1.5,
                        borderRadius: 2,
                        maxWidth: "75%",
                        position: "relative",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "flex-start",
                      }}
                    >
                      <Typography
                        component="span"
                        sx={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}
                      >
                        {msg.text}
                      </Typography>

                      <Box
                        sx={{
                          display: "flex",
                          justifyContent: "flex-end",
                          width: "100%",
                          mt: 0.5,
                        }}
                      >
                        <IconButton
                          onClick={() => speak(msg.text, i)}
                          size="small"
                          aria-label="Play message"
                          color={msg.is_user ? "inherit" : "default"}
                        >
                          <VolumeUpIcon
                            sx={{ color: msg.is_user ? "#fff" : "#000" }}
                          />
                        </IconButton>

                        {msg.is_user && msg.id && (
                          <IconButton
                            onClick={() => handleCheckGrammar(msg.id, i)}
                            size="small"
                            disabled={!msg.id}
                            aria-label="Check grammar"
                          >
                            {grammarLoadingId === msg.id ? (
                              <Box
                                sx={{
                                  transform: "scale(0.4)",
                                  transformOrigin: "center",
                                }}
                              >
                                <DotLoader size={30} color="#ffffff" />
                              </Box>
                            ) : (
                              <SpellcheckIcon sx={{ color: "#fff" }} />
                            )}
                          </IconButton>
                        )}
                      </Box>

                      {msg.corrected && (
                        <Box
                          sx={{
                            mt: 0.5,
                            fontSize: 12,
                            color: isDarkMode ? "#bbf7d0" : "#065f46",
                            bgcolor: isDarkMode ? "#064e3b" : "#d1fae5",
                            borderRadius: 1,
                            px: 1,
                            width: "100%",
                            wordBreak: "break-word",
                          }}
                        >
                          ✅ Corrected: {msg.corrected}
                        </Box>
                      )}
                    </Box>

                    {msg.is_user && (
                      <PersonIcon
                        sx={{ color: "primary.main", fontSize: 32 }}
                        aria-label="User"
                      />
                    )}
                  </Box>
                ))}

                {isAILoading && (
                  <Box sx={{ textAlign: "left", mt: 1, width: "10%" }}>
                    <ThreeDot
                      variant="bounce"
                      color={theme.palette.primary.main}
                      size="medium"
                    />
                  </Box>
                )}

                <div ref={chatEndRef} />
              </Box>

              <Box
                sx={{
                  display: "flex",
                  p: 2,
                  borderTop: 1,
                  borderColor: "divider",
                  gap: 1,
                }}
              >
                <TextField
                  fullWidth
                  multiline
                  maxRows={4}
                  variant="outlined"
                  placeholder="Type your message..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  aria-label="Message input"
                />

                <IconButton
                  onClick={startVoiceRecognition}
                  color="primary"
                  aria-label="Start voice input"
                >
                  {micLoading ? (
                    <ScaleLoader color="#1976d2" height={20} width={4} radius={2} />
                  ) : (
                    <MicIcon />
                  )}
                </IconButton>

                <IconButton onClick={handleSend} color="primary" aria-label="Send message">
                  <SendIcon />
                </IconButton>

                <IconButton
                  onClick={stopSpeaking}
                  color="secondary"
                  aria-label="Stop speech"
                  title="Stop speaking"
                >
                  <PauseIcon sx={{ transform: "rotate(180deg)" }} />
                </IconButton>
              </Box>
            </Paper>
          ) : (
            <PaymentPage setSubscribePage={setSubscribePage} />
          )}
        </Box>
      </Box>
    </ThemeProvider>
  );
};

export default ChatApp;
