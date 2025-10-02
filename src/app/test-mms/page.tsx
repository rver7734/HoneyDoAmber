"use client";

import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

export default function TestMmsPage() {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [carrier, setCarrier] = useState('');
  const [message, setMessage] = useState('Hello! This is a test MMS from Amber 🐾');
  const [testResult, setTestResult] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const sendTestMMS = async () => {
    if (!phoneNumber || !carrier || !message) {
      setTestResult('❌ Please fill in all fields');
      return;
    }

    setIsLoading(true);
    setTestResult('Sending test MMS...');

    try {
      const { getFunctions, httpsCallable } = await import('firebase/functions');
      const { firebaseApp } = await import('@/lib/firebase');
      const functions = getFunctions(firebaseApp);
      const sendTestMmsFunction = httpsCallable(functions, 'sendTestMMS');
      
      const payload = {
        phoneNumber: phoneNumber.replace(/\D/g, ''), // Remove non-digits
        carrier: carrier,
        message: message
      };
      
      console.log('Sending payload to function:', payload);
      setTestResult(`Sending test MMS...\nPayload: ${JSON.stringify(payload, null, 2)}`);
      
      const result = await sendTestMmsFunction(payload);

      setTestResult(`✅ MMS test successful!
        
MMS Email: ${result.data.mmsEmail}
Message: ${result.data.message}

Check your phone for the message!`);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      setTestResult(`❌ Error: ${message}`);
    } finally {
      setIsLoading(false);
    }
  };



  return (
    <div className="p-8 max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold">MMS Testing</h1>
      
      <Card>
        <CardHeader>
          <CardTitle>MMS Test Status</CardTitle>
        </CardHeader>
        <CardContent>
          <p>✅ Ready to send MMS messages</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Send Test MMS</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="phoneNumber">Phone Number (10 digits)</Label>
            <Input
              id="phoneNumber"
              type="tel"
              placeholder="1234567890"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              maxLength={10}
            />
          </div>

          <div>
            <Label htmlFor="carrier">Mobile Carrier</Label>
            <Select value={carrier} onValueChange={setCarrier}>
              <SelectTrigger>
                <SelectValue placeholder="Select your carrier" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="verizon">Verizon</SelectItem>
                <SelectItem value="att">AT&T</SelectItem>
                <SelectItem value="tmobile">T-Mobile</SelectItem>
                <SelectItem value="sprint">Sprint</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="message">Test Message</Label>
            <Textarea
              id="message"
              placeholder="Enter your test message..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
            />
          </div>

          <div className="bg-blue-50 p-3 rounded text-sm">
            <p><strong>Debug - Current Values:</strong></p>
            <p>Phone: &quot;{phoneNumber}&quot; (length: {phoneNumber.length})</p>
            <p>Carrier: &quot;{carrier}&quot;</p>
            <p>Message: &quot;{message}&quot; (length: {message.length})</p>
          </div>

          <Button 
            onClick={sendTestMMS} 
            disabled={isLoading || !phoneNumber || !carrier || !message}
            className="w-full"
          >
            {isLoading ? 'Sending...' : 'Send Test MMS'}
          </Button>

          {testResult && (
            <div className="bg-gray-100 p-4 rounded">
              <pre className="whitespace-pre-wrap text-sm">{testResult}</pre>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>How MMS Gateway Works</CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-2">
          <p><strong>Verizon:</strong> yourphone@vzwpix.com</p>
          <p><strong>AT&T:</strong> yourphone@mms.att.net</p>
          <p><strong>T-Mobile:</strong> yourphone@tmomail.net</p>
          <p><strong>Sprint:</strong> yourphone@pm.sprint.com</p>
          <p className="text-gray-600 mt-4">
            We send an email to your carrier&apos;s MMS gateway, which converts it to a text message on your phone.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
