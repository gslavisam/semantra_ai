import React, { useState } from 'react';
import { 
  Radio, 
  Database, 
  Send, 
  CheckCircle2, 
  AlertCircle, 
  Play, 
  RotateCcw, 
  ArrowRight, 
  Layers, 
  Copy, 
  Check, 
  Clock, 
  Activity,
  Server,
  Zap
} from 'lucide-react';

interface OutboxEvent {
  event_id: number;
  aggregate_type: string;
  aggregate_id: string;
  payload: Record<string, any>;
  created_at: string;
  processed: boolean;
  topic: string;
  kafka_ack_timestamp?: string;
  partition: number;
}

interface CanonicalDatabaseRow {
  vendor_id: string;
  vendor_name: string;
  tax_id: string;
  city: string;
  last_updated: string;
}

const INITIAL_CANONICAL_DB: CanonicalDatabaseRow[] = [
  {
    vendor_id: 'VND-9901',
    vendor_name: 'Robert Bosch d.o.o.',
    tax_id: 'RS100223344',
    city: 'Beograd',
    last_updated: '2026-08-31 10:14:22'
  },
  {
    vendor_id: 'VND-9902',
    vendor_name: 'Siemens Energy AG',
    tax_id: 'DE811122334',
    city: 'Munich',
    last_updated: '2026-08-31 11:30:05'
  }
];

const INITIAL_OUTBOX_EVENTS: OutboxEvent[] = [
  {
    event_id: 101,
    aggregate_type: 'VENDOR',
    aggregate_id: 'VND-9901',
    payload: { vendor_id: 'VND-9901', vendor_name: 'Robert Bosch d.o.o.', tax_id: 'RS100223344' },
    created_at: '2026-08-31 10:14:22',
    processed: true,
    topic: 'semantra.vendor.events.v1',
    kafka_ack_timestamp: '2026-08-31 10:14:23.104',
    partition: 0
  },
  {
    event_id: 102,
    aggregate_type: 'VENDOR',
    aggregate_id: 'VND-9902',
    payload: { vendor_id: 'VND-9902', vendor_name: 'Siemens Energy AG', tax_id: 'DE811122334' },
    created_at: '2026-08-31 11:30:05',
    processed: true,
    topic: 'semantra.vendor.events.v1',
    kafka_ack_timestamp: '2026-08-31 11:30:05.412',
    partition: 1
  }
];

export const TransactionalOutboxStudio: React.FC = () => {
  const [databaseRows, setDatabaseRows] = useState<CanonicalDatabaseRow[]>(INITIAL_CANONICAL_DB);
  const [outboxEvents, setOutboxEvents] = useState<OutboxEvent[]>(INITIAL_OUTBOX_EVENTS);
  const [isCdcRunning, setIsCdcRunning] = useState<boolean>(false);
  const [copiedCode, setCopiedCode] = useState<boolean>(false);

  // Form states for creating a new atomic transaction
  const [inputVendorId, setInputVendorId] = useState<string>('VND-9933');
  const [inputVendorName, setInputVendorName] = useState<string>('Schneider Electric Serbia');
  const [inputTaxId, setInputTaxId] = useState<string>('RS109988776');
  const [inputCity, setInputCity] = useState<string>( 'Novi Sad');
  const [lastTxStatus, setLastTxStatus] = useState<string | null>(null);

  // Execute Atomic Transaction: Writes Canonical Table + Outbox Table inside 1 single local SQL transaction
  const handleCommitAtomicTransaction = () => {
    const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);

    const newDbRow: CanonicalDatabaseRow = {
      vendor_id: inputVendorId,
      vendor_name: inputVendorName,
      tax_id: inputTaxId,
      city: inputCity,
      last_updated: timestamp
    };

    const newEvent: OutboxEvent = {
      event_id: outboxEvents.length + 101,
      aggregate_type: 'VENDOR',
      aggregate_id: inputVendorId,
      payload: {
        vendor_id: inputVendorId,
        vendor_name: inputVendorName,
        tax_id: inputTaxId,
        city: inputCity
      },
      created_at: timestamp,
      processed: false, // Pending CDC Debezium pickup
      topic: 'semantra.vendor.events.v1',
      partition: Math.floor(Math.random() * 3)
    };

    // Atomic SQLite Commit Simulation
    setDatabaseRows(prev => [newDbRow, ...prev]);
    setOutboxEvents(prev => [newEvent, ...prev]);
    setLastTxStatus(`SUCCESS: Atomic Transaction Committed. Canonical row saved & Outbox event #${newEvent.event_id} queued (Unprocessed).`);

    // Prepare next mock ID
    setInputVendorId(`VND-${Math.floor(1000 + Math.random() * 9000)}`);
  };

  // Simulate CDC Debezium Relay: Reads transaction log & emits to Kafka with ACK guarantee
  const handleSimulateCdcRelay = () => {
    const unprocessed = outboxEvents.filter(e => !e.processed);
    if (unprocessed.length === 0) {
      alert('All outbox events have already been relayed and confirmed by Kafka broker.');
      return;
    }

    setIsCdcRunning(true);
    setTimeout(() => {
      const ackTime = new Date().toISOString().replace('T', ' ').substring(0, 23);
      setOutboxEvents(prev => prev.map(e => ({
        ...e,
        processed: true,
        kafka_ack_timestamp: e.kafka_ack_timestamp || ackTime
      })));
      setIsCdcRunning(false);
      setLastTxStatus(`CDC RELAY COMPLETE: ${unprocessed.length} event(s) emitted to Kafka topic 'semantra.vendor.events.v1' with At-Least-Once ACK.`);
    }, 800);
  };

  const copyPython = () => {
    navigator.clipboard.writeText(pythonSnippet);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const pythonSnippet = `# Semantra Transactional Outbox Pattern (Pydantic V2 Event Envelope & CDC Relay)
from pydantic import BaseModel, ConfigDict, Field
from typing import Dict, Any, List, Optional, Generic, TypeVar
from datetime import datetime
import sqlite3, json, time, uuid

T = TypeVar('T')

class OutboxEventEnvelope(BaseModel, Generic[T]):
    """
    Pydantic V2 Generic Event Envelope standardizovan za Kafka / CloudEvents specifikaciju.
    """
    model_config = ConfigDict(str_strip_whitespace=True)

    event_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    aggregate_type: str = Field(..., description="Domen entiteta (npr. VENDOR, INVOICE)")
    aggregate_id: str = Field(..., description="Primarni ključ entiteta")
    event_type: str = Field(default="RECORD_CANONICALIZED")
    timestamp_utc: str = Field(default_factory=lambda: datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ"))
    payload: T

class VendorRecordPayload(BaseModel):
    vendor_id: str
    vendor_name: str
    tax_id: str

class SemantraTransactionalOutboxEngine:
    def __init__(self, db_path: str = "semantra.sqlite3"):
        self.conn = sqlite3.connect(db_path)
        self._init_schema()

    def _init_schema(self):
        cur = self.conn.cursor()
        cur.execute("""
            CREATE TABLE IF NOT EXISTS canonical_vendors (
                vendor_id TEXT PRIMARY KEY, vendor_name TEXT, tax_id TEXT
            )
        """)
        cur.execute("""
            CREATE TABLE IF NOT EXISTS outbox_events (
                event_id TEXT PRIMARY KEY,
                aggregate_type TEXT, aggregate_id TEXT,
                payload TEXT, created_at REAL, processed INTEGER DEFAULT 0
            )
        """)
        self.conn.commit()

    def save_record_with_outbox(self, vendor: VendorRecordPayload) -> bool:
        """
        Atomska lokalna transakcija (ACID):
        Garantuje 0 gubitka poruka i rešava Dual-Write problem.
        """
        envelope = OutboxEventEnvelope[VendorRecordPayload](
            aggregate_type="VENDOR",
            aggregate_id=vendor.vendor_id,
            payload=vendor
        )

        cur = self.conn.cursor()
        try:
            cur.execute("BEGIN TRANSACTION;")
            # 1. Upis u kanonsku relacionu tabelu
            cur.execute("INSERT INTO canonical_vendors VALUES (?, ?, ?)", 
                        (vendor.vendor_id, vendor.vendor_name, vendor.tax_id))
            
            # 2. Istovremeni upis Pydantic event envelope-a u outbox tabelu
            cur.execute(
                "INSERT INTO outbox_events (event_id, aggregate_type, aggregate_id, payload, created_at) VALUES (?, ?, ?, ?, ?)",
                (envelope.event_id, envelope.aggregate_type, envelope.aggregate_id, envelope.model_dump_json(), time.time())
            )
            self.conn.commit()
            print(f"[TRANSACTION COMMITTED] Upisan vendor '{vendor.vendor_id}' i kreiran Outbox event '{envelope.event_id}'.")
            return True
        except Exception as e:
            self.conn.rollback()
            print(f"[TRANSACTION ROLLEDBACK] Greška: {e}")
            return False

    def simulate_cdc_debezium_relay(self) -> List[Dict[str, Any]]:
        """
        CDC Log Tailing (Debezium/WAL) -> Čita Outbox tabelu i emituje u Kafka stream.
        Garantuje At-Least-Once isporuku.
        """
        cur = self.conn.cursor()
        cur.execute("SELECT event_id, aggregate_type, aggregate_id, payload FROM outbox_events WHERE processed = 0")
        emitted_kafka_events = []

        for row in cur.fetchall():
            event_id, agg_type, agg_id, payload_json = row
            topic = f"semantra.{agg_type.lower()}.events.v1"
            
            # Simulacija slanja u Kafku
            emitted_kafka_events.append({
                "kafka_topic": topic,
                "partition_key": agg_id,
                "event": json.loads(payload_json)
            })
            
            # Označavamo event kao procesiran
            cur.execute("UPDATE outbox_events SET processed = 1 WHERE event_id = ?", (event_id,))
        
        self.conn.commit()
        return emitted_kafka_events`;

  const unprocessedCount = outboxEvents.filter(e => !e.processed).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 via-purple-950 to-slate-900 border border-slate-800 rounded-2xl p-6 text-white shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-semibold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                P2 Distributed Reliability
              </span>
              <span className="px-2 py-0.5 rounded-md text-[11px] font-mono bg-slate-800 text-slate-300 border border-slate-700">
                CDC Debezium Log Tailing
              </span>
              <span className="px-2 py-0.5 rounded-md text-[11px] font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold">
                Execution Target: PostgreSQL WAL &amp; Apache Kafka
              </span>
            </div>
            <h2 className="text-xl font-bold font-sans tracking-tight flex items-center gap-2">
              <Radio className="w-6 h-6 text-purple-400" />
              Transactional Outbox Pattern &amp; CDC Kafka Relay
            </h2>
            <p className="text-sm text-slate-300 max-w-3xl leading-relaxed">
              <strong>Control Plane Sandbox:</strong> Solves the Dual-Write Problem. Semantra models and compiles atomic local ACID transactions and CDC Debezium connectors for your existing PostgreSQL database and Apache Kafka cluster, guaranteeing At-Least-Once event delivery.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleSimulateCdcRelay}
              disabled={isCdcRunning || unprocessedCount === 0}
              className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-lg flex items-center gap-2 cursor-pointer ${
                unprocessedCount > 0
                  ? 'bg-purple-600 hover:bg-purple-500 text-white shadow-purple-600/30 animate-pulse'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
              }`}
            >
              <Zap className="w-4 h-4 fill-current" />
              <span>{isCdcRunning ? 'CDC Polling...' : `Trigger CDC Relay (${unprocessedCount} Pending)`}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Transaction Generator (Dual-Write Protection) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Form to commit atomic transaction (7 cols) */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-purple-600" />
              <h3 className="text-sm font-bold text-slate-800">Atomic Local Database Transaction (Mapper Ingress)</h3>
            </div>
            <span className="text-xs font-mono text-slate-500">BEGIN ... COMMIT</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Vendor ID</label>
              <input
                type="text"
                value={inputVendorId}
                onChange={(e) => setInputVendorId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs font-mono text-slate-900 focus:ring-2 focus:ring-purple-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Vendor Name</label>
              <input
                type="text"
                value={inputVendorName}
                onChange={(e) => setInputVendorName(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs font-medium text-slate-900 focus:ring-2 focus:ring-purple-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Tax ID</label>
              <input
                type="text"
                value={inputTaxId}
                onChange={(e) => setInputTaxId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs font-mono text-slate-900 focus:ring-2 focus:ring-purple-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">City</label>
              <input
                type="text"
                value={inputCity}
                onChange={(e) => setInputCity(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs text-slate-900 focus:ring-2 focus:ring-purple-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <p className="text-[11px] text-slate-500 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              Guarantees zero partial writes if server crashes before network ACK.
            </p>
            <button
              onClick={handleCommitAtomicTransaction}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
            >
              <Play className="w-3.5 h-3.5 fill-white" />
              <span>Commit Single SQL Transaction</span>
            </button>
          </div>

          {lastTxStatus && (
            <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg text-xs font-mono text-purple-900">
              {lastTxStatus}
            </div>
          )}
        </div>

        {/* Architecture Topology Info (5 cols) */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Activity className="w-4 h-4 text-slate-500" />
              Reliability Metrics
            </h3>
            <button
              onClick={copyPython}
              className="text-[11px] font-mono text-purple-600 hover:underline flex items-center gap-1 cursor-pointer"
            >
              {copiedCode ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
              <span>{copiedCode ? 'Copied' : 'Copy Python'}</span>
            </button>
          </div>

          <div className="space-y-3">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono uppercase font-bold text-slate-400 block">Outbox Buffer State</span>
                <span className="text-xs font-bold text-slate-800 font-mono">{unprocessedCount} pending CDC relay</span>
              </div>
              <span className={`w-2.5 h-2.5 rounded-full ${unprocessedCount > 0 ? 'bg-amber-500 animate-ping' : 'bg-emerald-500'}`} />
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
              <span className="text-[10px] font-mono uppercase font-bold text-slate-400 block">Delivery Guarantee</span>
              <span className="text-xs font-bold text-slate-800 font-mono">At-Least-Once Delivery (Debezium + Kafka Ack)</span>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
              <span className="text-[10px] font-mono uppercase font-bold text-slate-400 block">Target Kafka Topic</span>
              <span className="text-xs font-bold text-purple-700 font-mono">semantra.vendor.events.v1</span>
            </div>
          </div>
        </div>
      </div>

      {/* Dual Tables View: Canonical Table vs Outbox CDC Events */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Table 1: Canonical Master DB Table */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-slate-700" />
              <h4 className="text-xs font-bold text-slate-800 uppercase font-mono tracking-wider">
                1. Canonical Table (`canonical_vendors`)
              </h4>
            </div>
            <span className="text-[11px] font-mono text-slate-500">{databaseRows.length} records</span>
          </div>

          <div className="overflow-x-auto max-h-64 overflow-y-auto">
            <table className="w-full text-left text-xs border-collapse font-sans">
              <thead className="sticky top-0 bg-slate-50 border-b border-slate-200 font-mono text-slate-600">
                <tr>
                  <th className="p-2">Vendor ID</th>
                  <th className="p-2">Name</th>
                  <th className="p-2">Tax ID</th>
                  <th className="p-2">Updated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                {databaseRows.map(row => (
                  <tr key={row.vendor_id} className="hover:bg-slate-50/60">
                    <td className="p-2 font-bold text-slate-900">{row.vendor_id}</td>
                    <td className="p-2 text-slate-800 font-sans font-medium">{row.vendor_name}</td>
                    <td className="p-2 text-slate-500">{row.tax_id}</td>
                    <td className="p-2 text-slate-400">{row.last_updated}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Table 2: Outbox Table (Pending & Relayed Kafka Stream) */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Radio className="w-4 h-4 text-purple-600" />
              <h4 className="text-xs font-bold text-purple-900 uppercase font-mono tracking-wider">
                2. Outbox Table (`outbox_events`)
              </h4>
            </div>
            <span className="text-[11px] font-mono text-purple-700">{outboxEvents.length} events</span>
          </div>

          <div className="overflow-x-auto max-h-64 overflow-y-auto">
            <table className="w-full text-left text-xs border-collapse font-sans">
              <thead className="sticky top-0 bg-purple-50 border-b border-purple-200 font-mono text-purple-900">
                <tr>
                  <th className="p-2">Event #</th>
                  <th className="p-2">Key</th>
                  <th className="p-2">Kafka Topic</th>
                  <th className="p-2">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-purple-100/60 font-mono text-[11px]">
                {outboxEvents.map(evt => (
                  <tr key={evt.event_id} className="hover:bg-purple-50/40">
                    <td className="p-2 font-bold text-purple-950">#{evt.event_id}</td>
                    <td className="p-2 text-slate-800">{evt.aggregate_id}</td>
                    <td className="p-2 text-purple-700">{evt.topic}</td>
                    <td className="p-2">
                      {evt.processed ? (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          RELAYED (ACK)
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 animate-pulse">
                          PENDING CDC
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
