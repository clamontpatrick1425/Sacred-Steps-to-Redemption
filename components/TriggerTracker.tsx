import React, { useState, useEffect } from 'react';
import { collection, addDoc, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { handleFirestoreError, OperationType } from '../utils/firestoreErrorHandler';

interface TriggerLog {
  id: string;
  intensity: number;
  trigger: string;
  copingMechanism: string;
  createdAt: string;
}

interface TriggerTrackerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TriggerTracker: React.FC<TriggerTrackerProps> = ({ isOpen, onClose }) => {
  const [logs, setLogs] = useState<TriggerLog[]>([]);
  const [intensity, setIntensity] = useState<number>(5);
  const [trigger, setTrigger] = useState('');
  const [copingMechanism, setCopingMechanism] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !auth.currentUser) return;

    const q = query(
      collection(db, 'triggers'),
      where('userId', '==', auth.currentUser.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const newLogs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as TriggerLog[];
      setLogs(newLogs);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'triggers');
    });

    return () => unsubscribe();
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) {
      setError("You must be logged in to log a trigger.");
      return;
    }
    
    setIsSubmitting(true);
    setError(null);

    try {
      await addDoc(collection(db, 'triggers'), {
        userId: auth.currentUser.uid,
        intensity,
        trigger,
        copingMechanism,
        createdAt: new Date().toISOString()
      });
      setTrigger('');
      setCopingMechanism('');
      setIntensity(5);
    } catch (err: any) {
      try {
        handleFirestoreError(err, OperationType.CREATE, 'triggers');
      } catch (handledErr: any) {
        setError(handledErr.message || 'Failed to log trigger.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-card rounded-2xl shadow-2xl max-w-2xl w-full flex flex-col max-h-[90vh] overflow-hidden">
        <div className="p-6 border-b border-default flex justify-between items-center bg-card-secondary">
          <h2 className="text-2xl font-bold text-main">Trigger & Craving Tracker</h2>
          <button onClick={onClose} className="text-muted hover:text-main">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-grow">
          <form onSubmit={handleSubmit} className="mb-8 space-y-4 bg-card-secondary p-4 rounded-xl border border-default">
            <h3 className="font-bold text-main mb-2">Log a New Trigger</h3>
            {error && <div className="p-3 bg-red-100 text-red-700 rounded-md text-sm">{error}</div>}
            
            <div>
              <label className="block text-sm font-medium text-muted mb-1">
                Intensity (1-10): <span className="font-bold text-primary">{intensity}</span>
              </label>
              <input
                type="range"
                min="1"
                max="10"
                value={intensity}
                onChange={(e) => setIntensity(Number(e.target.value))}
                className="w-full accent-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-muted mb-1">What triggered this craving?</label>
              <input
                type="text"
                value={trigger}
                onChange={(e) => setTrigger(e.target.value)}
                className="w-full px-3 py-2 border border-input rounded-md focus:ring-primary focus:border-primary bg-card"
                placeholder="e.g., Stress at work, seeing an old friend..."
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-muted mb-1">How did you cope?</label>
              <input
                type="text"
                value={copingMechanism}
                onChange={(e) => setCopingMechanism(e.target.value)}
                className="w-full px-3 py-2 border border-input rounded-md focus:ring-primary focus:border-primary bg-card"
                placeholder="e.g., Called sponsor, went for a walk..."
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2 bg-primary text-on-primary rounded-md hover:bg-primary-hover transition-colors font-medium disabled:opacity-50"
            >
              {isSubmitting ? 'Logging...' : 'Log Trigger'}
            </button>
          </form>

          <div>
            <h3 className="font-bold text-main mb-4">Recent Logs</h3>
            {logs.length === 0 ? (
              <p className="text-muted italic text-center py-4">No triggers logged yet. Stay strong!</p>
            ) : (
              <div className="space-y-3">
                {logs.map(log => (
                  <div key={log.id} className="bg-card p-4 rounded-xl border border-default shadow-sm">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-xs text-muted">
                        {new Date(log.createdAt).toLocaleString()}
                      </span>
                      <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                        log.intensity > 7 ? 'bg-red-100 text-red-700' :
                        log.intensity > 4 ? 'bg-yellow-100 text-yellow-700' :
                        'bg-green-100 text-green-700'
                      }`}>
                        Intensity: {log.intensity}
                      </span>
                    </div>
                    <p className="text-main font-medium mb-1"><strong>Trigger:</strong> {log.trigger}</p>
                    {log.copingMechanism && (
                      <p className="text-muted text-sm"><strong>Coped by:</strong> {log.copingMechanism}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
