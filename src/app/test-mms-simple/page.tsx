"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function SimpleMmsTest() {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [carrier, setCarrier] = useState('');
  const [message, setMessage] = useState('Test message from Amber!');
  const [result, setResult] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const sendMMS = async () => {
    setIsLoading(true);
    setResult('Sending...');

    console.log('Form values:', { phoneNumber, carrier, message });

    try {
      const { getFunctions, httpsCallable } = await import('firebase/functions');
      const { firebaseApp } = await import('@/lib/firebase');
      
      const functions = getFunctions(firebaseApp);
      const sendTestMmsFunction = httpsCallable(functions, 'sendTestMMS');
      
      const payload = {
        phoneNumber: phoneNumber,
        carrier: carrier,
        message: message
      };
      
      console.log('Sending payload:', payload);
      
      const response = await sendTestMmsFunction(payload);
      
      console.log('Response:', response);
      setResult(`✅ Success! Sent to: ${response.data.mmsEmail}`);
      
    } catch (error: unknown) {
      console.error('Error:', error);
      const message = error instanceof Error ? error.message : String(error);
      setResult(`❌ Error: ${message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-md mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Simple MMS Test</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Phone Number</Label>
            <Input
              type="text"
              placeholder="1234567890"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
            />
          </div>

          <div>
            <Label>Carrier</Label>
            <select 
              value={carrier} 
              onChange={(e) => setCarrier(e.target.value)}
              className="w-full p-2 border rounded"
            >
              <option value="">Select carrier</option>
              <option value="verizon">Verizon</option>
              <option value="att">AT&T</option>
              <option value="tmobile">T-Mobile</option>
              <option value="sprint">Sprint</option>
            </select>
          </div>

          <div>
            <Label>Message</Label>
            <Input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          </div>

          <Button 
            onClick={sendMMS} 
            disabled={isLoading || !phoneNumber || !carrier}
            className="w-full"
          >
            {isLoading ? 'Sending...' : 'Send MMS'}
          </Button>

          {result && (
            <div className="p-3 bg-gray-100 rounded text-sm">
              {result}
            </div>
          )}

          <div className="text-xs text-gray-500">
            <p>Phone: &quot;{phoneNumber}&quot;</p>
            <p>Carrier: &quot;{carrier}&quot;</p>
            <p>Message: &quot;{message}&quot;</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
