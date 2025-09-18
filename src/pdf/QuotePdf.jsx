// src/pdf/QuotePdf.jsx
import React from "react";
import { Document, Page, View, Text, Image, StyleSheet } from "@react-pdf/renderer";
import valdicassLogo from "../assets/valdicass-logo.png";
import greenskyLogo from "../assets/greensky-logo.jpeg";
import { COMPANY } from "../companyInfo";

const styles = StyleSheet.create({
  page: { padding: 24, fontSize: 10, fontFamily: "Helvetica" },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  h1: { fontSize: 18, fontWeight: 700 },
  section: { marginTop: 12 },
  bold: { fontWeight: 700 },
  small: { fontSize: 9 },
  companyBlock: {
    display: "flex",
    flexDirection: "column",
    gap: 2,
  },
  logo: {
    width: 100,        // tweak to taste (64–100 works well)
    height: 84,
    marginBottom: 6,
  },
  companyName: {
    fontSize: 14,
    fontWeight: 700,
    marginBottom: 2,
  },
  companyLine: {
    fontSize: 9,
    color: "#6b7280",
  },
});
// Choose the best available sales rep info from the quote
function pickRep(quote = {}) {
  const p = quote.preparedBy || {};
  const name  = p.name  || quote.preparedByName  || quote.createdByName  || "Valdicass Team";
  const email = p.email || quote.preparedByEmail || quote.createdByEmail || "";
  const phone = p.phone || quote.preparedByPhone || "";
  return { name, email, phone };
}

function dollars(n) {
  const x = Number(n || 0);
  return `$${x.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function QuotePdf({ quote }) {
  const q = quote || {};
  const items = Array.isArray(q.rooms)
    ? q.rooms.flatMap((r) =>
        (Array.isArray(r.items) ? r.items : []).map((it) => ({ ...it, room: r.name }))
      )
    : [];

  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Image src={valdicassLogo} style={{ width: 110 }} />
          <View>
            <Text style={styles.h1}>Estimate</Text>
            <Text>ID: {q.id || "DRAFT"}</Text>
          </View>
        </View>
        const rep = pickRep(quote);

<View style={styles.header}>
  {/* Left: Valdicass + contact */}
  <View style={styles.companyBlock}>
    <Image src={valdicassLogo} style={styles.logo} />
    <Text style={s.companyName}>{COMPANY.name}</Text>
<Text style={s.companyLine}>{COMPANY.addressLine}</Text>
<Text style={s.companyLine}>
  {COMPANY.officePhone} • {COMPANY.website}
</Text>



    {/* 👇 show the logged-in rep first; fall back to office info */}
    <Text style={styles.companySmall}>
  {rep.name}
  {rep.phone ? ` • ${rep.phone}` : ""}
  {rep.email ? ` • ${rep.email}` : ""}
</Text>

  </View>

  {/* Right: estimate meta */}
  <View style={styles.metaBlock}>
    <Text style={styles.metaTitle}>ESTIMATE</Text>
    <View style={styles.metaRow}><Text>Estimate #</Text><Text>{quote.number || quote.id}</Text></View>
    <View style={styles.metaRow}><Text>Date</Text><Text>{renderDate(quote.createdAt)}</Text></View>
    <View style={styles.metaRow}><Text>Status</Text><Text>{(quote.status || "draft").toLowerCase()}</Text></View>
  </View>
</View>


        {/* Client */}
        <View style={styles.section}>
          <Text style={styles.bold}>Client</Text>
          <Text>{q?.client?.name || "—"}</Text>
          <Text>{q?.client?.address || "—"}</Text>
          <Text>{q?.client?.clientEmail || "—"}</Text>
        </View>

        {/* Items (simple rows, no borders) */}
        {items.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.bold}>Items</Text>
            {items.map((it, i) => {
              const qty = Number(it.quantity || 0);
              const unit = Number(it.unitPrice || 0);
              const line = qty * unit;
              return (
                <View key={i} style={styles.row}>
                  <Text>{[it.room, it.type, it.style].filter(Boolean).join(" • ") || "—"}</Text>
                  <Text>
                    {qty} × {dollars(unit)} = {dollars(line)}
                  </Text>
                </View>
              );
            })}
          </View>
        )}

        {/* Totals */}
        <View style={styles.section}>
          <View style={styles.row}>
            <Text>Subtotal</Text>
            <Text>{dollars(q.subtotal)}</Text>
          </View>
          <View style={styles.row}>
            <Text>Tax</Text>
            <Text>{dollars(q.tax)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.bold}>Grand Total</Text>
            <Text style={styles.bold}>{dollars(q.total)}</Text>
          </View>
        </View>

        {/* Footer */}
        <View style={[styles.section, styles.row]}>
          <Text style={styles.small}>Thank you for choosing Valdicass.</Text>
          <Image src={greenskyLogo} style={{ width: 80 }} />
        </View>
      </Page>
    </Document>
  );
}


