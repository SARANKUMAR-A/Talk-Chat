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
  Button,
  Modal,
} from "@mui/material";
import SendIcon from "@mui/icons-material/Send";
import MicIcon from "@mui/icons-material/Mic";
import VolumeUpIcon from "@mui/icons-material/VolumeUp";
import LogoutIcon from "@mui/icons-material/Logout";
import SpellcheckIcon from "@mui/icons-material/Spellcheck";
import PersonIcon from "@mui/icons-material/Person";
import SmartToyIcon from "@mui/icons-material/SmartToy";
import HomeIcon from "@mui/icons-material/Home";
import PauseIcon from "@mui/icons-material/Pause";
import { ThreeDot } from "react-loading-indicators";
import { DotLoader, ScaleLoader } from "react-spinners";
import PaymentPage from "./pages/PaymentPage";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";

// StylishPopup Component for token expiry alert
const StylishPopup = ({ open, onClose, onLogout }) => {
  return (
    <Modal
      open={open}
      onClose={onClose}
      aria-labelledby="popup-title"
      aria-describedby="popup-description"
    >
      <Box
        sx={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          bgcolor: "background.paper",
          boxShadow: 24,
          p: 4,
          borderRadius: 2,
          maxWidth: 400,
          textAlign: "center",
        }}
      >
        <Typography id="popup-title" variant="h6" gutterBottom>
          Session Expired
        </Typography>
        <Typography id="popup-description" sx={{ mb: 3 }}>
          Your session has expired. Please log in again to continue.
        </Typography>
        <Button variant="contained" color="primary" onClick={onLogout}>
          Logout
        </Button>
      </Box>
    </Modal>
  );
};

const ChatApp = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [grammarLoadingId, setGrammarLoadingId] = useState(null);
  const [isAILoading, setIsAILoading] = useState(false);
  const [micLoading, setMicLoading] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [speakingIndex, setSpeakingIndex] = useState(null);
  const [subscribePage, setSubscribePage] = useState(false);
  const [tokenExpired, setTokenExpired] = useState(false);
  const chatContainerRef = useRef(null);
  const [isRecording, setIsRecording] = useState(false);
  const recognitionRef = useRef(null);

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

  // Check response status for token expiry
  const checkTokenExpiry = (response) => {
    if (response.status === 401) {
      setTokenExpired(true);
      return true;
    }
    return false;
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
      .then((res) => {
        if (checkTokenExpiry(res)) throw new Error("Token expired");
        return res.json();
      })
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
    const newMessages = [
      ...messages,
      { is_user: true, text: input, id: tempId },
    ];
    setMessages(newMessages);
    setInput("");
    setIsAILoading(true);
    setIsRecording(false);

    try {
      const res = await fetch("/chat/send/", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ text: input }),
      });
      if (checkTokenExpiry(res)) throw new Error("Token expired");
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

  const toggleVoiceRecognition = () => {
    if (!isRecording) {
      const SpeechRecognition =
        window.SpeechRecognition || window.webkitSpeechRecognition;

      if (!SpeechRecognition) {
        alert("Speech recognition not supported in this browser.");
        return;
      }

      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = "en-IN"; // or your preferred language
      recognition.maxAlternatives = 3;

      let finalTranscript = "";

      recognition.onresult = (event) => {
        let interimTranscript = "";
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }
        setInput(finalTranscript + interimTranscript);
      };

      recognition.onend = () => {
        if (isRecording) {
          recognition.start(); // auto-restart for continuous speech
        }
      };

      recognition.onerror = (event) => {
        console.error("Speech recognition error:", event.error);
        if (event.error !== "aborted") {
          recognition.stop();
        }
      };

      recognition.start();
      setIsRecording(true);
    } else {
      recognitionRef.current?.stop();
      setIsRecording(false);
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
      if (checkTokenExpiry(res)) throw new Error("Token expired");
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
    fetch("/logout", { method: "POST", headers: getAuthHeaders() }).finally(
      () => {
        localStorage.clear();
        navigate("/login");
      }
    );
  };

  // Subscription page toggle
  const handleSubscribe = () => {
    setSubscribePage(true);
  };

  const handleHome = () => {
    setSubscribePage(false);
    navigate("/");
  };

  const scrollToTop = () => {
    chatContainerRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  };

  const scrollToBottom = () => {
    chatContainerRef.current?.scrollTo({
      top: chatContainerRef.current.scrollHeight,
      behavior: "smooth",
    });
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
            <IconButton
              color="inherit"
              onClick={() => setIsDarkMode(!isDarkMode)}
            >
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
                ref={chatContainerRef}
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
                <Box
                  sx={{
                    position: "fixed",
                    bottom: 100,
                    right: 30,
                    display: "flex",
                    flexDirection: "column",
                    gap: 1,
                    zIndex: 1000,
                  }}
                >
                  <Button
                    variant="contained"
                    color="primary"
                    size="small"
                    onClick={scrollToTop}
                    sx={{
                      borderRadius: "50%",
                      minWidth: 0,
                      width: 48,
                      height: 48,
                    }}
                    title="Scroll to Top"
                  >
                    <ArrowUpwardIcon />
                  </Button>
                  <Button
                    variant="contained"
                    color="primary"
                    size="small"
                    onClick={scrollToBottom}
                    sx={{
                      borderRadius: "50%",
                      minWidth: 0,
                      width: 48,
                      height: 48,
                    }}
                    title="Scroll to Bottom"
                  >
                    <ArrowDownwardIcon />
                  </Button>
                </Box>
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
                  onClick={toggleVoiceRecognition}
                  color={isRecording ? "error" : "primary"}
                  aria-label="Toggle voice input"
                  title={isRecording ? "Stop Recording" : "Start Recording"}
                >
                  {micLoading ? (
                    <ScaleLoader
                      color="#1976d2"
                      height={20}
                      width={4}
                      radius={2}
                    />
                  ) : (
                    <MicIcon />
                  )}
                </IconButton>

                <IconButton
                  onClick={handleSend}
                  color="primary"
                  aria-label="Send message"
                >
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

        {/* Token Expired Popup */}
        <StylishPopup
          open={tokenExpired}
          onClose={() => {}}
          onLogout={handleLogout}
        />
      </Box>
    </ThemeProvider>
  );
};

export default ChatApp;
