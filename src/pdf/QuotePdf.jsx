// src/pdf/QuotePdf.jsx
// PDF component for Valdicass quotes using @react-pdf/renderer
// Drop this file into src/pdf/ then follow the integration steps in chat.

import React from "react";
import {
  Document,
  Page,
  View,
  Text,
  Image,
  StyleSheet,
} from "@react-pdf/renderer";

// --- ASSETS ---
// Update paths to match your project
import valdicassLogo from "../assets/valdicass-logo.png"; // 600px wide transparent PNG recommended
import greenskyLogo from "../assets/greensky-logo.jpeg";  // or .jpg

// --- STYLES ---
const styles = StyleSheet.create({
  page: {
    paddingTop: 28,
    paddingBottom: 32,
    paddingHorizontal: 28,
    fontSize: 10,
    color: "#111827", // gray-900
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  logo: { width: 140, height: 40, objectFit: "contain" },
  titleBlock: { textAlign: "right" },
  title: { fontSize: 20, fontWeight: 700 },
  sub: { fontSize: 10, marginTop: 2, color: "#374151" },

  section: { marginTop: 12 },
  card: { border: 1, borderColor: "#E5E7EB", borderRadius: 6, padding: 10 },
  row: { flexDirection: "row" },
  col: { flexGrow: 1 },
  label: { color: "#6B7280" },
  strong: { fontWeight: 700 },

  table: {
    width: "100%",
    borderRadius: 6,
    overflow: "hidden",
    border: 1,
    borderColor: "#E5E7EB",
    marginTop: 8,
  },
  thead: { backgroundColor: "#F3F4F6" },
  tr: {
    flexDirection: "row",
    alignItems: "stretch",
  },
  th: {
    paddingVertical: 6,
    paddingHorizontal: 6,
    fontWeight: 700,
    fontSize: 9,
    borderRight: 1,
    borderColor: "#E5E7EB",
  },
  td: {
    paddingVertical: 6,
    paddingHorizontal: 6,
    borderTop: 1,
    borderRight: 1,
    borderColor: "#E5E7EB",
    fontSize: 9,
  },
  tdLast: { borderRight: 0 },
  thLast: { borderRight: 0 },

  totalsRow: {
    marginTop: 10,
    alignSelf: "flex-end",
    width: 260,
  },
  totalsLine: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
  },
  totalsLabel: { color: "#374151" },
  totalsValue: { fontWeight: 700 },

  finePrint: { marginTop: 10, color: "#6B7280", lineHeight: 1.4 },
  footer: {
    position: "absolute",
    bottom: 22,
    left: 28,
    right: 28,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  greensky: { width: 90, height: 28, objectFit: "contain" },
  footerText: { color: "#6B7280", fontSize: 9 },
});

// --- HELPERS ---
const currency = (v = 0, locale = "en-US", currency = "USD") =>
  new Intl.NumberFormat(locale, { style: "currency", currency }).format(v);

const safe = (v, fallback = "-") => (v === undefined || v === null || v === "" ? fallback : v);

// Expecting quote shape similar to what's already in your app:
// {
//   id, createdAt, createdByName,
//   client: { name, email, phone, address },
//   rooms: [
//     { name: "Living Room", items: [
//        { type, style, material, series, colorInt, colorExt, installMethod, qty, unitPrice, notes }
//     ]}
//   ],
//   fees: { labor = 0, disposal = 0, misc = 0 },
//   subtotal, tax, total
// }

export default function QuotePdf({ quote }) {
  const locale = "en-US";
  const company = {
    name: "Valdicass Inc.",
    phone: "708.255.5231",
    address: "8920 W 47th St., Brookfield, IL 60513",
    url: "www.valdicass.com",
    certs: "Pella Platinum Elite • James Hardie Alliance Select",
  };

  const calcLine = (item) => {
    const qty = Number(item?.qty || 0);
    const unit = Number(item?.unitPrice || 0);
    return qty * unit;
  };

  const rooms = Array.isArray(quote?.rooms) ? quote.rooms : [];
  const items = rooms.flatMap((r) => (r.items || []).map((it) => ({ ...it, __room: r.name || "Room" })));

  const subtotal =
    quote?.subtotal !== undefined
      ? Number(quote.subtotal)
      : items.reduce((acc, it) => acc + calcLine(it), 0);

  const tax = Number(quote?.tax || 0);
  const total = quote?.total !== undefined ? Number(quote.total) : subtotal + tax;

  const createdAt = quote?.createdAt
    ? new Date(quote.createdAt.seconds ? quote.createdAt.seconds * 1000 : quote.createdAt)
    : new Date();

  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        {/* HEADER */}
        <View style={styles.headerRow}>
          <Image style={styles.logo} src={valdicassLogo} />
          <View style={styles.titleBlock}>
            <Text style={styles.title}>Estimate</Text>
            <Text style={styles.sub}>Quote ID: {safe(quote?.id)}</Text>
            <Text style={styles.sub}>Date: {createdAt.toLocaleDateString()}</Text>
          </View>
        </View>

        {/* COMPANY & CLIENT */}
        <View style={[styles.section, styles.row]}>          
          <View style={[styles.col, styles.card]}>            
            <Text style={styles.strong}>{company.name}</Text>
            <Text>{company.address}</Text>
            <Text>Phone: {company.phone}</Text>
            <Text>Web: {company.url}</Text>
            <Text>{company.certs}</Text>
          </View>
          <View style={{ width: 12 }} />
          <View style={[styles.col, styles.card]}>            
            <Text style={styles.label}>Prepared For</Text>
            <Text style={styles.strong}>{safe(quote?.client?.name)}</Text>
            {quote?.client?.address ? <Text>{quote.client.address}</Text> : null}
            {quote?.client?.email ? <Text>Email: {quote.client.email}</Text> : null}
            {quote?.client?.phone ? <Text>Phone: {quote.client.phone}</Text> : null}
            {quote?.createdByName ? (
              <Text>Sales Rep: {quote.createdByName}</Text>
            ) : null}
          </View>
        </View>

        {/* LINE ITEMS */}
        <View style={styles.section}>
          <Text style={styles.strong}>Items</Text>
          <View style={styles.table}>
            <View style={[styles.thead, styles.tr]}>
              <Text style={[styles.th, { width: 88 }]}>Room</Text>
              <Text style={[styles.th, { width: 70 }]}>Type</Text>
              <Text style={[styles.th, { width: 84 }]}>Style</Text>
              <Text style={[styles.th, { width: 66 }]}>Series</Text>
              <Text style={[styles.th, { width: 64 }]}>Material</Text>
              <Text style={[styles.th, { width: 58 }]}>Install</Text>
              <Text style={[styles.th, { width: 38, textAlign: "right" }]}>Qty</Text>
              <Text style={[styles.th, { width: 68, textAlign: "right" }]}>Unit</Text>
              <Text style={[styles.th, styles.thLast, { width: 72, textAlign: "right" }]}>Line</Text>
            </View>

            {items.length === 0 ? (
              <View style={styles.tr}>
                <Text style={[styles.td, styles.tdLast, { width: "100%" }]}>No items</Text>
              </View>
            ) : (
              items.map((it, idx) => (
                <View key={idx} style={styles.tr} wrap={false}>
                  <Text style={[styles.td, { width: 88 }]}>{safe(it.__room)}</Text>
                  <Text style={[styles.td, { width: 70 }]}>{safe(it.type)}</Text>
                  <Text style={[styles.td, { width: 84 }]}>{safe(it.style)}</Text>
                  <Text style={[styles.td, { width: 66 }]}>{safe(it.series)}</Text>
                  <Text style={[styles.td, { width: 64 }]}>{safe(it.material)}</Text>
                  <Text style={[styles.td, { width: 58 }]}>{safe(it.installMethod)}</Text>
                  <Text style={[styles.td, { width: 38, textAlign: "right" }]}>{safe(it.qty, 0)}</Text>
                  <Text style={[styles.td, { width: 68, textAlign: "right" }]}>{currency(it.unitPrice, locale)}</Text>
                  <Text style={[styles.td, styles.tdLast, { width: 72, textAlign: "right" }]}>
                    {currency(calcLine(it), locale)}
                  </Text>
                </View>
              ))
            )}
          </View>
        </View>

        {/* TOTALS */}
        <View style={styles.totalsRow}>
          <View style={styles.totalsLine}>
            <Text style={styles.totalsLabel}>Subtotal</Text>
            <Text style={styles.totalsValue}>{currency(subtotal, locale)}</Text>
          </View>
          <View style={styles.totalsLine}>
            <Text style={styles.totalsLabel}>Tax</Text>
            <Text style={styles.totalsValue}>{currency(tax, locale)}</Text>
          </View>
          <View style={[styles.totalsLine, { borderTop: 1, borderColor: "#E5E7EB", marginTop: 6, paddingTop: 6 }]}>
            <Text style={[styles.totalsLabel, styles.strong]}>Total</Text>
            <Text style={[styles.totalsValue, { fontSize: 12 }]}>{currency(total, locale)}</Text>
          </View>
        </View>

        {/* NOTES */}
        {quote?.notes ? (
          <View style={[styles.section, styles.card]}>
            <Text style={styles.strong}>Notes</Text>
            <Text>{quote.notes}</Text>
          </View>
        ) : null}

        {/* TERMS */}
        <View style={styles.section}>
          <Text style={styles.strong}>Terms & Conditions</Text>
          <Text style={styles.finePrint}>
            Pricing valid for 30 days from the date of this estimate. Scheduling is confirmed upon receipt of deposit. Any changes to
            scope, materials, or unforeseen conditions may affect final pricing. Manufacturer warranties apply to products; workmanship
            warranty provided by Valdicass Inc. Payment due as specified in the signed agreement.
          </Text>
        </View>

        {/* FOOTER */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>{company.name} • {company.phone} • {company.url}</Text>
          <Image style={styles.greensky} src={greenskyLogo} />
        </View>
      </Page>
    </Document>
  );
}
