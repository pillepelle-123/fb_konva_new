# Implementierung: Sicherheit und Messenger-Features (Feb 2025)

## Übersicht

Umsetzung des Plans "Sicherheit und Messenger-Features" mit allen Anpassungen gemäß Rückfragen.

## Datenbank-Migrationen

**Wichtig:** Führe die Migrationen vor dem Start des Servers aus:

```bash
cd server/migrations
psql $DATABASE_URL -f add_friend_invitations_and_user_blocks.sql
psql $DATABASE_URL -f add_conversation_participant_settings.sql
psql $DATABASE_URL -f add_conversation_invitations.sql
# Friendships: eine Zeile pro Freundschaft + Soft Delete (ended_at)
psql $DATABASE_URL -f refactor_friendships_one_row_soft_delete.sql
```

### Friendships-Refaktor (eine Zeile pro Freundschaft + Soft Delete)

- **Eine Zeile pro Freundschaft**: `user_id < friend_id` (CHECK-Constraint), keine Duplikate (A,B) und (B,A)
- **Soft Delete**: `ended_at` statt physischem DELETE; Re-Freundschaften reaktivieren die Zeile
- **invitation_id**: Optional, verknüpft Freundschaft mit der Einladung, die sie ausgelöst hat

### Neue Tabellen

- **friend_invitations**: Einladungsflow für Freundschaften (pending/accepted/rejected)
- **user_blocks**: Blockierte User, optional verknüpft mit `friendship_id` wenn innerhalb einer Freundschaft blockiert
- **conversation_participant_settings**: muted, archived pro Konversation/User
- **conversation_invitations**: Einladungsflow für Direkt-Chats

## Implementierte Features

### 1. API-Sicherheitsfixes
- Messenger: Teilnehmerprüfung bei POST messages und POST read
- Messenger: Freundschafts-/Buch-Prüfung bei Konversationserstellung
- E-Mail aus Profil-API und Nutzersuche entfernt
- Auth: Explizite Spaltenauswahl statt SELECT *
- Profilbild: Magic-Bytes-Validierung (gemeinsame Utility in `server/utils/image-validation.js`)

### 2. Friend-Invitations
- Bei Ablehnung wird **keine** Freundschaft angelegt
- 24h Wartezeit nach Ablehnung vor erneuter Einladung
- Socket-Events: `friend_invitation_received`, `friend_invitation_responded`
- Notification-Popover: Annehmen/Ablehnen-Buttons, Anzeige für Sender nach Antwort

### 3. Block-User
- Freundschaft wird **nicht** gelöscht; Verknüpfung über `user_blocks.friendship_id`
- Blockierte User werden aus Freundesliste gefiltert (nicht gelöscht)
- Block-Button auf Profilseite und Friend-Card

### 4. Buch vs. Friendship
- Klare Trennung: Buch-Einladungen (invitations/send) erzeugen **keine** Freundschaft
- `books/:id/friends`: Nur Freunde können zum Buch hinzugefügt werden (keine Auto-Freundschaft)
- `addCollaboratorByEmail`: Keine Freundschaft mehr bei Buch-Einladung

### 5. Conversation-Invitation (Direkt-Chats)
- Einladungsflow: Konversation mit nur Inviter, Einladung an Invitee
- Annehmen/Ablehnen im Notification-Popover
- 24h Wartezeit nach Ablehnung (analog Friend-Invitation)

### 6. Stummschalten, Archivieren, Blockieren (Alternative)
- **user_blocks** für Block (kein `blocked_by_user_id` in conversation_participant_settings)
- Tabs Aktiv/Archiv in Conversation-List
- Icon-Buttons: Stummschalten, Archivieren, Blockieren (nur Direkt-Chats)
- Bei Block: Konversation für Blockierenden archiviert, für blockierten User "Blocked by other"

## API-Endpunkte (neu/geändert)

| Methode | Pfad | Beschreibung |
|---------|------|--------------|
| POST | /api/friend-invitations | Einladung senden |
| POST | /api/friend-invitations/:id/respond | Annehmen/Ablehnen |
| GET | /api/friend-invitations/received | Pending-Einladungen |
| GET | /api/friend-invitations/received/all | Alle empfangenen |
| GET | /api/friend-invitations/sent | Gesendete |
| POST | /api/user-blocks | User blockieren |
| DELETE | /api/user-blocks/:blockedId | Block aufheben |
| GET | /api/user-blocks | Blockierte IDs |
| PATCH | /api/messenger/conversations/:id/settings | muted, archived |
| POST | /api/messenger/conversations/:id/block | Blockieren (Direkt-Chat) |
| GET | /api/messenger/conversation-invitations | Empfangene Chat-Einladungen |
| POST | /api/messenger/conversation-invitations/:id/respond | Chat-Einladung annehmen/ablehnen |
