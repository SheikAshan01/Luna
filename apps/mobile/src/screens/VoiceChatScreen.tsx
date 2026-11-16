import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { Send, Mic, MicOff, Volume2 } from 'lucide-react-native';
import { Audio } from 'expo-av';
import { MobileAPI } from '../services/api';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  time: string;
}

export const VoiceChatScreen: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'Vanakkam! Naan LUNA. Mobile assistant ready. Enna command execute pannanum?',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingInstance, setRecordingInstance] = useState<Audio.Recording | null>(null);
  const [currentSound, setCurrentSound] = useState<Audio.Sound | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    return () => {
      // Cleanup sound on unmount
      if (currentSound) {
        currentSound.unloadAsync();
      }
    };
  }, [currentSound]);

  const handleSend = async (overrideText?: string) => {
    const textToSend = (overrideText || input).trim();
    if (!textToSend || isSending) return;
    if (!overrideText) setInput('');

    const userMsg: Message = {
      id: `usr-${Date.now()}`,
      role: 'user',
      content: textToSend,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsSending(true);

    try {
      const res = await MobileAPI.sendChatMessage(textToSend, 'ta-IN');
      const asstMsg: Message = {
        id: `asst-${Date.now()}`,
        role: 'assistant',
        content: res.message,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, asstMsg]);
      playAudio(res.message);

      // Open dynamic actions (WhatsApp, YouTube song) on mobile
      if (res.toolResults && Array.isArray(res.toolResults)) {
        for (const tr of res.toolResults) {
          const actUrl = tr.result?.data?.url || tr.result?.url;
          if (actUrl) {
            Linking.openURL(actUrl).catch(() => {});
          }
        }
      }
    } catch (err: any) {
      const errMsg: Message = {
        id: `err-${Date.now()}`,
        role: 'assistant',
        content: `Error: ${err.message || 'PC Connection timeout'}`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errMsg]);
    } finally {
      setIsSending(false);
    }
  };

  const playAudio = async (text: string) => {
    try {
      if (currentSound) {
        await currentSound.stopAsync();
        await currentSound.unloadAsync();
        setCurrentSound(null);
      }

      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
      });

      const audioUrl = await MobileAPI.getTTSAudioUrl(text, 'ta-IN');
      const { sound } = await Audio.Sound.createAsync(
        { uri: audioUrl },
        { shouldPlay: true }
      );
      setCurrentSound(sound);
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          sound.unloadAsync();
          setCurrentSound(null);
        }
      });
    } catch (e) {
      console.warn('Audio playback error on mobile:', e);
    }
  };

  const handleToggleVoiceRecord = async () => {
    if (isRecording) {
      // Stop recording and transcribe
      if (!recordingInstance) return;
      setIsRecording(false);
      try {
        await recordingInstance.stopAndUnloadAsync();
        const uri = recordingInstance.getURI();
        setRecordingInstance(null);

        if (uri) {
          setIsSending(true);
          const transcribedText = await MobileAPI.transcribeAudio(uri, 'ta');
          if (transcribedText && transcribedText.trim()) {
            await handleSend(transcribedText);
          }
        }
      } catch (e) {
        console.error('Error stopping recording:', e);
      } finally {
        setIsSending(false);
      }
    } else {
      // Start recording
      try {
        const perm = await Audio.requestPermissionsAsync();
        if (perm.status !== 'granted') return;

        await Audio.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
        });

        const newRecording = new Audio.Recording();
        await newRecording.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
        await newRecording.startAsync();
        setRecordingInstance(newRecording);
        setIsRecording(true);
      } catch (e) {
        console.error('Failed to start voice recording:', e);
        setIsRecording(false);
      }
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      <ScrollView
        ref={scrollViewRef}
        onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
        style={styles.chatScroll}
        contentContainerStyle={styles.chatContent}
      >
        {messages.map((m) => {
          const isUser = m.role === 'user';
          return (
            <View
              key={m.id}
              style={[styles.msgRow, isUser ? styles.msgRowUser : styles.msgRowAsst]}
            >
              <View
                style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleAsst]}
              >
                <Text style={styles.bubbleText}>{m.content}</Text>
                <View style={styles.bubbleFooter}>
                  <Text style={styles.timeText}>{m.time}</Text>
                  {!isUser && (
                    <TouchableOpacity onPress={() => playAudio(m.content)}>
                      <Volume2 size={13} color="#00CFFF" />
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </View>
          );
        })}
      </ScrollView>

      {/* Input Bar */}
      <View style={styles.inputContainer}>
        <TouchableOpacity
          style={[styles.micBtn, isRecording && styles.micBtnActive]}
          onPress={handleToggleVoiceRecord}
        >
          {isRecording ? <MicOff size={18} color="#FFFFFF" /> : <Mic size={18} color="#00CFFF" />}
        </TouchableOpacity>

        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder={isRecording ? "Recording your voice... Tap mic to send" : "Speak or type in Tamil / English..."}
          placeholderTextColor="#91A0B7"
          editable={!isRecording && !isSending}
          onSubmitEditing={() => handleSend()}
        />

        <TouchableOpacity
          style={[styles.sendBtn, (!input.trim() || isSending) && styles.sendBtnDisabled]}
          onPress={() => handleSend()}
          disabled={!input.trim() || isSending}
        >
          {isSending ? (
            <ActivityIndicator size="small" color="#070B14" />
          ) : (
            <Send size={16} color={input.trim() ? '#070B14' : '#91A0B7'} />
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#070B14' },
  chatScroll: { flex: 1 },
  chatContent: { padding: 16, paddingBottom: 24 },
  msgRow: { flexDirection: 'row', marginBottom: 12 },
  msgRowUser: { justifyContent: 'flex-end' },
  msgRowAsst: { justifyContent: 'flex-start' },
  bubble: {
    maxWidth: '82%',
    padding: 12,
    borderRadius: 16,
  },
  bubbleUser: {
    backgroundColor: '#0D223F',
    borderWidth: 1,
    borderColor: '#00CFFF',
    borderTopRightRadius: 2,
  },
  bubbleAsst: {
    backgroundColor: '#0D1422',
    borderWidth: 1,
    borderColor: '#1B2A4A',
    borderTopLeftRadius: 2,
  },
  bubbleText: { color: '#F4F8FF', fontSize: 13, lineHeight: 18 },
  bubbleFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  timeText: { color: '#91A0B7', fontSize: 9 },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#0D1422',
    borderTopWidth: 1,
    borderColor: '#1B2A4A',
    gap: 8,
  },
  micBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#101B2E',
    borderWidth: 1,
    borderColor: '#00CFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  micBtnActive: {
    backgroundColor: '#FF3366',
    borderColor: '#FF3366',
  },
  input: {
    flex: 1,
    backgroundColor: '#070B14',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1B2A4A',
    paddingHorizontal: 14,
    paddingVertical: 8,
    color: '#F4F8FF',
    fontSize: 13,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#00CFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    backgroundColor: '#1B2A4A',
  },
});
