"use client";

import { useState } from 'react';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, collection, addDoc, getDocs } from 'firebase/firestore';

export default function DebugPage() {
  const [testResult, setTestResult] = useState<string>('');
  const [firestoreResult, setFirestoreResult] = useState<string>('');

  const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  };

  const testFirebaseConnection = async () => {
    setTestResult('Testing...');
    try {
      const response = await fetch(`https://identitytoolkit.googleapis.com/v1/projects/${firebaseConfig.projectId}/config?key=${firebaseConfig.apiKey}`);
      const data = await response.json();
      
      if (response.ok) {
        setTestResult(`✅ Firebase connection successful! Project: ${data.projectId || 'Unknown'}`);
      } else {
        setTestResult(`❌ Firebase connection failed: ${response.status} - ${JSON.stringify(data)}`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setTestResult(`❌ Network error: ${message}`);
    }
  };

  const testFirestoreConnection = async () => {
    setFirestoreResult('Testing Firestore...');
    
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Firestore test timed out after 15 seconds')), 15000);
    });

    try {
      await Promise.race([
        (async () => {
          console.log('[Debug] Initializing Firebase app...');
          const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
          console.log('[Debug] Getting Firestore instance...');
          
          const db = getFirestore(app);
          console.log('[Debug] Creating test collection...');

          const testCollection = collection(db, 'debug-test');
          console.log('[Debug] Adding test document...');
          
          const docRef = await addDoc(testCollection, {
            message: 'Test connection - Firestore is working!',
            timestamp: new Date(),
            test: true
          });
          console.log('[Debug] Document added:', docRef.id);

          console.log('[Debug] Reading documents...');
          const snapshot = await getDocs(testCollection);
          const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          console.log('[Debug] Found', docs.length, 'documents');

          setFirestoreResult(`🎉 Firestore connection successful! 
            - Database is now working
            - Document created: ${docRef.id}
            - Documents found: ${docs.length}
            - Test completed successfully`);
        })(),
        timeoutPromise
      ]);
    } catch (error: unknown) {
      const err = error instanceof Error ? error : new Error(String(error));
      console.error('[Debug] Firestore test failed:', err);
      setFirestoreResult(`❌ Firestore connection failed: ${err.message}
        Error code: ${(err as { code?: string }).code || 'unknown'}
        Full error: ${JSON.stringify(err, Object.getOwnPropertyNames(err))}`);
    }
  };

  return (
    <div className="p-8 max-w-4xl">
      <h1 className="text-2xl font-bold mb-4">Debug Information</h1>
      
      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-2">Current URL</h2>
        <p className="bg-gray-100 p-2 rounded">{typeof window !== 'undefined' ? window.location.href : 'Server-side'}</p>
      </div>

      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-2">Environment Variables</h2>
        <div className="bg-gray-100 p-4 rounded">
          <p><strong>NODE_ENV:</strong> {process.env.NODE_ENV}</p>
          <p><strong>NEXT_PUBLIC_FIREBASE_API_KEY:</strong> {process.env.NEXT_PUBLIC_FIREBASE_API_KEY ? `${process.env.NEXT_PUBLIC_FIREBASE_API_KEY.substring(0, 10)}...` : '❌ Missing'}</p>
          <p><strong>NEXT_PUBLIC_FIREBASE_PROJECT_ID:</strong> {process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || '❌ Missing'}</p>
          <p><strong>NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN:</strong> {process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || '❌ Missing'}</p>
        </div>
      </div>

      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-2">Firebase Configuration Object</h2>
        <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
          {JSON.stringify(firebaseConfig, null, 2)}
        </pre>
      </div>

      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-2">Environment Check</h2>
        <ul className="space-y-1">
          <li>API Key: {firebaseConfig.apiKey ? '✅ Set' : '❌ Missing'}</li>
          <li>Auth Domain: {firebaseConfig.authDomain ? '✅ Set' : '❌ Missing'}</li>
          <li>Project ID: {firebaseConfig.projectId ? '✅ Set' : '❌ Missing'}</li>
          <li>Storage Bucket: {firebaseConfig.storageBucket ? '✅ Set' : '❌ Missing'}</li>
          <li>Messaging Sender ID: {firebaseConfig.messagingSenderId ? '✅ Set' : '❌ Missing'}</li>
          <li>App ID: {firebaseConfig.appId ? '✅ Set' : '❌ Missing'}</li>
        </ul>
      </div>

      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-2">Firebase Connection Test</h2>
        <button 
          onClick={testFirebaseConnection}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 mb-4 mr-4"
        >
          Test Firebase Connection
        </button>
        <button 
          onClick={testFirestoreConnection}
          className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 mb-4"
        >
          Test Firestore Connection
        </button>
        {testResult && (
          <div className="bg-gray-100 p-4 rounded mb-4">
            <h3 className="font-semibold">Firebase Auth Test:</h3>
            <pre className="whitespace-pre-wrap">{testResult}</pre>
          </div>
        )}
        {firestoreResult && (
          <div className="bg-gray-100 p-4 rounded">
            <h3 className="font-semibold">Firestore Test:</h3>
            <pre className="whitespace-pre-wrap">{firestoreResult}</pre>
          </div>
        )}
      </div>

      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-2">Expected Values</h2>
        <div className="bg-yellow-50 p-4 rounded">
          <p><strong>Expected API Key:</strong> AIzaSyC_V52R4JI3TstlZ68HEAlPOk6O8ey3Zpk</p>
          <p><strong>Expected Project ID:</strong> ambers-affirmations</p>
          <p><strong>Expected Auth Domain:</strong> ambers-affirmations.firebaseapp.com</p>
        </div>
      </div>
    </div>
  );
}
