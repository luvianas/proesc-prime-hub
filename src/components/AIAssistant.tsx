
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { X, Send, Bot, User, Lightbulb, BarChart3, HelpCircle } from "lucide-react";

interface AIAssistantProps {
  onClose: () => void;
}

const AIAssistant = ({ onClose }: AIAssistantProps) => {
  const [messages, setMessages] = useState([
    {
      type: "bot",
      content: "Olá! Sou a IA Assistente do Proesc Prime. Posso ajudá-lo a navegar e entender melhor suas dashboards. Como posso auxiliá-lo hoje?",
      timestamp: new Date()
    }
  ]);
  const [inputMessage, setInputMessage] = useState("");

  const quickSuggestions = [
    {
      text: "Como interpretar o dashboard financeiro?",
      icon: BarChart3
    },
    {
      text: "Explicar métricas de matrícula",
      icon: HelpCircle
    },
    {
      text: "Dicas para usar o sistema pedagógico",
      icon: Lightbulb
    }
  ];

  const handleSendMessage = () => {
    if (!inputMessage.trim()) return;

    const userMessage = {
      type: "user",
      content: inputMessage,
      timestamp: new Date()
    };

    // Simulated AI response
    const botResponse = {
      type: "bot",
      content: `Entendi sua pergunta sobre "${inputMessage}". Com base nas suas dashboards Prime, posso explicar que essa funcionalidade permite um controle mais detalhado dos dados. Precisa de mais esclarecimentos sobre algum aspecto específico?`,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage, botResponse]);
    setInputMessage("");
  };

  const handleSuggestionClick = (suggestion: string) => {
    setInputMessage(suggestion);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl max-h-[80vh] flex flex-col">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Bot className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <CardTitle>IA Assistente Prime</CardTitle>
              <CardDescription>Seu guia inteligente para as dashboards</CardDescription>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>

        <CardContent className="flex-1 flex flex-col space-y-4">
          {/* Quick Suggestions */}
          <div className="flex flex-wrap gap-2">
            {quickSuggestions.map((suggestion, index) => (
              <Button
                key={index}
                variant="outline"
                size="sm"
                onClick={() => handleSuggestionClick(suggestion.text)}
                className="flex items-center space-x-1 text-xs"
              >
                <suggestion.icon className="h-3 w-3" />
                <span>{suggestion.text}</span>
              </Button>
            ))}
          </div>

          {/* Messages */}
          <ScrollArea className="flex-1 h-96 pr-4">
            <div className="space-y-4">
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={`flex items-start space-x-3 ${
                    message.type === "user" ? "justify-end" : ""
                  }`}
                >
                  {message.type === "bot" && (
                    <div className="p-2 bg-blue-100 rounded-full">
                      <Bot className="h-4 w-4 text-blue-600" />
                    </div>
                  )}
                  <div
                    className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                      message.type === "user"
                        ? "bg-blue-600 text-white"
                        : "bg-gray-100 text-gray-900"
                    }`}
                  >
                    <p className="text-sm">{message.content}</p>
                    <p className="text-xs opacity-70 mt-1">
                      {message.timestamp.toLocaleTimeString('pt-BR', { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </p>
                  </div>
                  {message.type === "user" && (
                    <div className="p-2 bg-gray-100 rounded-full">
                      <User className="h-4 w-4 text-gray-600" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>

          {/* Input */}
          <div className="flex space-x-2">
            <Input
              placeholder="Digite sua pergunta sobre as dashboards..."
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
              className="flex-1"
            />
            <Button onClick={handleSendMessage} size="sm">
              <Send className="h-4 w-4" />
            </Button>
          </div>

          <div className="text-xs text-gray-500 text-center">
            <Badge variant="secondary">Beta</Badge>
            <span className="ml-2">IA treinada com dados específicos do Proesc Prime</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AIAssistant;
