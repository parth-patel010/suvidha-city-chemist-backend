import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MessageSquare, Send, CheckCircle, XCircle, Plus, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { apiUrl } from "@/lib/api";

export default function WhatsApp() {
  const token = localStorage.getItem("pharmacy_token");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [sendPhone, setSendPhone] = useState("");
  const [sendMessage, setSendMessage] = useState("");
  const [sendOpen, setSendOpen] = useState(false);

  const { data: status } = useQuery({
    queryKey: ["whatsapp-status"],
    queryFn: async () => {
      const res = await fetch(apiUrl("/api/whatsapp/status"), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return { error: "Not configured" };
      return res.json();
    },
  });

  const { data: templates } = useQuery({
    queryKey: ["whatsapp-templates"],
    queryFn: async () => {
      const res = await fetch(apiUrl("/api/whatsapp/templates"), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const { data: messages, isLoading: messagesLoading } = useQuery({
    queryKey: ["whatsapp-messages"],
    queryFn: async () => {
      const res = await fetch(apiUrl("/api/whatsapp/messages"), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const sendMutation = useMutation({
    mutationFn: async (data: { phoneNumber: string; message: string }) => {
      const res = await fetch(apiUrl("/api/whatsapp/send"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to send");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["whatsapp-messages"] });
      toast({ title: "Message sent successfully" });
      setSendOpen(false);
      setSendPhone("");
      setSendMessage("");
    },
    onError: () => {
      toast({ title: "Failed to send message", variant: "destructive" });
    },
  });

  const isConfigured = status && !status.error;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">WhatsApp</h1>
          <p className="text-muted-foreground text-sm">Manage WhatsApp messaging and campaigns</p>
        </div>
        <Dialog open={sendOpen} onOpenChange={setSendOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-send-message">
              <Send className="h-4 w-4 mr-2" />
              Send Message
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Send WhatsApp Message</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Phone Number *</Label>
                <Input
                  placeholder="+91XXXXXXXXXX"
                  value={sendPhone}
                  onChange={(e) => setSendPhone(e.target.value)}
                  data-testid="input-send-phone"
                />
              </div>
              <div className="space-y-2">
                <Label>Message *</Label>
                <Textarea
                  placeholder="Type your message..."
                  value={sendMessage}
                  onChange={(e) => setSendMessage(e.target.value)}
                  rows={4}
                  data-testid="input-send-message"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setSendOpen(false)}>Cancel</Button>
                <Button
                  onClick={() => sendMutation.mutate({ phoneNumber: sendPhone, message: sendMessage })}
                  disabled={!sendPhone || !sendMessage || sendMutation.isPending}
                  data-testid="button-confirm-send"
                >
                  {sendMutation.isPending ? "Sending..." : "Send"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Phone className="h-5 w-5" />
            Connection Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            {isConfigured ? (
              <>
                <CheckCircle className="h-5 w-5 text-green-500" />
                <span className="text-green-600 font-medium">Connected</span>
              </>
            ) : (
              <>
                <XCircle className="h-5 w-5 text-red-500" />
                <span className="text-red-600 font-medium">Not Configured</span>
                <span className="text-sm text-muted-foreground">- Set WHATSAPP_ACCESS_TOKEN and WHATSAPP_PHONE_NUMBER_ID environment variables</span>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="messages">
        <TabsList>
          <TabsTrigger value="messages">Message Log</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
        </TabsList>

        <TabsContent value="messages" className="mt-4">
          <Card>
            <CardContent className="pt-6">
              {messagesLoading ? (
                <p className="text-center py-8 text-muted-foreground">Loading messages...</p>
              ) : messages && messages.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Phone</TableHead>
                      <TableHead>Message</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Sent At</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {messages.map((msg: any) => (
                      <TableRow key={msg.id} data-testid={`row-message-${msg.id}`}>
                        <TableCell className="font-mono text-sm">{msg.phoneNumber}</TableCell>
                        <TableCell className="max-w-xs truncate">{msg.message}</TableCell>
                        <TableCell>
                          <Badge variant={msg.status === "SENT" || msg.status === "DELIVERED" ? "default" : msg.status === "FAILED" ? "destructive" : "secondary"}>
                            {msg.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {msg.sentAt ? new Date(msg.sentAt).toLocaleString() : "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-12">
                  <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No messages sent yet</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="templates" className="mt-4">
          <Card>
            <CardContent className="pt-6">
              {templates && templates.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Template Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Message</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {templates.map((t: any) => (
                      <TableRow key={t.id} data-testid={`row-template-${t.id}`}>
                        <TableCell className="font-medium">{t.templateName}</TableCell>
                        <TableCell><Badge variant="outline">{t.templateType}</Badge></TableCell>
                        <TableCell className="max-w-xs truncate text-sm">{t.message}</TableCell>
                        <TableCell>
                          <Badge variant={t.isActive ? "default" : "secondary"}>
                            {t.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-12">
                  <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No templates configured</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
