'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiUrl } from '../lib/api-client';

type ApiKey = {
  id: string;
  label: string | null;
  createdAt: string;
  lastUsedAt: string | null;
  status: string;
};

export default function ApiKeysSection() {
  const { auth } = useAuth();
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(false);
  const [newApiKey, setNewApiKey] = useState<string | null>(null);
  const [newApiKeyId, setNewApiKeyId] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [label, setLabel] = useState('');
  const [creating, setCreating] = useState(false);
  const [copiedKeyId, setCopiedKeyId] = useState<string | null>(null);

  const fetchApiKeys = async () => {
    if (!auth) return;
    setLoading(true);
    try {
      const response = await fetch(apiUrl('admin/api-keys'), {
        headers: { Authorization: `Bearer ${auth.accessToken}` },
      });
      if (response.ok) {
        const keys = await response.json();
        setApiKeys(keys);
      }
    } catch (error) {
      console.error('Error fetching API keys', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApiKeys();
  }, [auth]);

  const handleCreate = async () => {
    if (!auth || creating) return;
    setCreating(true);
    try {
      const response = await fetch(apiUrl('admin/api-keys'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${auth.accessToken}`,
        },
        body: JSON.stringify({ label: label || undefined }),
      });
      if (response.ok) {
        const data = await response.json();
        setNewApiKey(data.apiKey);
        // Stocker temporairement l'ID de la nouvelle clé pour pouvoir la copier
        if (data.id) {
          setNewApiKeyId(data.id);
          // Stocker dans sessionStorage pour que la page demo puisse la récupérer
          if (data.apiKey && data.id) {
            sessionStorage.setItem('newApiKey', data.apiKey);
            sessionStorage.setItem('newApiKeyId', data.id);
          }
        }
        setLabel('');
        fetchApiKeys();
      } else {
        const error = await response.json();
        alert(error.message || 'Erreur lors de la création de la clé API');
      }
    } catch (error) {
      alert('Erreur lors de la création de la clé API');
    } finally {
      setCreating(false);
    }
  };

  return (
    <>
      <section className="card card-glass" style={{ marginTop: '3rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.5rem' }}>🔑 Clés API</h3>
            <p style={{ margin: '0.5rem 0 0', color: '#94a3b8', fontSize: '0.9rem' }}>
              Gérez vos clés API pour intégrer KryptPay SDK dans vos applications
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowModal(true)}
            style={{
              padding: '0.75rem 1.5rem',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
              border: 'none',
              color: '#ffffff',
              cursor: 'pointer',
              fontWeight: '600',
              fontSize: '0.95rem',
            }}
          >
            + Créer une clé API
          </button>
        </div>

        {loading ? (
          <p style={{ color: '#94a3b8', textAlign: 'center', padding: '2rem' }}>Chargement...</p>
        ) : apiKeys.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
            <p>Aucune clé API. Créez-en une pour commencer à intégrer BoohPay SDK.</p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Label</th>
                  <th>Statut</th>
                  <th>Créée le</th>
                  <th>Dernière utilisation</th>
                  <th>ID</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {apiKeys.map((key) => (
                  <tr key={key.id}>
                    <td>{key.label || <span style={{ color: '#94a3b8' }}>—</span>}</td>
                    <td>
                      <span className={key.status === 'ACTIVE' ? 'chip chip-success' : 'chip chip-danger'}>
                        {key.status}
                      </span>
                    </td>
                    <td>
                      {new Intl.DateTimeFormat('fr-FR', {
                        dateStyle: 'short',
                        timeStyle: 'short',
                      }).format(new Date(key.createdAt))}
                    </td>
                    <td>
                      {key.lastUsedAt
                        ? new Intl.DateTimeFormat('fr-FR', {
                            dateStyle: 'short',
                            timeStyle: 'short',
                          }).format(new Date(key.lastUsedAt))
                        : <span style={{ color: '#94a3b8' }}>Jamais utilisée</span>}
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontFamily: 'monospace', fontSize: '0.85rem', color: '#94a3b8' }}>
                          {key.id}
                        </span>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        {/* Bouton pour copier l'ID */}
                        <button
                          type="button"
                          onClick={async () => {
                            try {
                              await navigator.clipboard.writeText(key.id);
                              setCopiedKeyId(key.id);
                              setTimeout(() => setCopiedKeyId(null), 2000);
                            } catch (error) {
                              // Fallback pour les navigateurs qui ne supportent pas clipboard API
                              const textArea = document.createElement('textarea');
                              textArea.value = key.id;
                              textArea.style.position = 'fixed';
                              textArea.style.opacity = '0';
                              document.body.appendChild(textArea);
                              textArea.select();
                              try {
                                document.execCommand('copy');
                                setCopiedKeyId(key.id);
                                setTimeout(() => setCopiedKeyId(null), 2000);
                              } catch (err) {
                                alert('Impossible de copier. Veuillez sélectionner manuellement.');
                              }
                              document.body.removeChild(textArea);
                            }
                          }}
                          style={{
                            padding: '0.5rem 0.75rem',
                            borderRadius: '6px',
                            border: '1px solid rgba(148, 163, 184, 0.3)',
                            background: copiedKeyId === key.id
                              ? 'rgba(34, 197, 94, 0.2)'
                              : 'rgba(139, 92, 246, 0.15)',
                            color: copiedKeyId === key.id ? '#86efac' : '#c4b5fd',
                            cursor: 'pointer',
                            fontSize: '0.85rem',
                            whiteSpace: 'nowrap',
                            transition: 'all 0.2s ease',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                          }}
                          title="Copier l'ID de la clé API"
                        >
                          {copiedKeyId === key.id ? '✓ Copié' : '📋 Copier ID'}
                        </button>
                        {/* Afficher un bouton pour copier la clé complète si c'est la nouvelle clé créée */}
                        {newApiKey && newApiKeyId === key.id && (
                          <button
                            type="button"
                            onClick={async () => {
                              try {
                                await navigator.clipboard.writeText(newApiKey);
                                setCopiedKeyId(`key-${key.id}`);
                                setTimeout(() => setCopiedKeyId(null), 2000);
                              } catch (error) {
                                const textArea = document.createElement('textarea');
                                textArea.value = newApiKey;
                                textArea.style.position = 'fixed';
                                textArea.style.opacity = '0';
                                document.body.appendChild(textArea);
                                textArea.select();
                                try {
                                  document.execCommand('copy');
                                  setCopiedKeyId(`key-${key.id}`);
                                  setTimeout(() => setCopiedKeyId(null), 2000);
                                } catch (err) {
                                  alert('Impossible de copier. Veuillez sélectionner manuellement.');
                                }
                                document.body.removeChild(textArea);
                              }
                            }}
                            style={{
                              padding: '0.5rem 0.75rem',
                              borderRadius: '6px',
                              border: '1px solid rgba(251, 191, 36, 0.3)',
                              background: copiedKeyId === `key-${key.id}`
                                ? 'rgba(34, 197, 94, 0.2)'
                                : 'rgba(251, 191, 36, 0.15)',
                              color: copiedKeyId === `key-${key.id}` ? '#86efac' : '#fbbf24',
                              cursor: 'pointer',
                              fontSize: '0.85rem',
                              whiteSpace: 'nowrap',
                              transition: 'all 0.2s ease',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.5rem',
                            }}
                            title="Copier la clé API complète (visible uniquement après création)"
                          >
                            {copiedKeyId === `key-${key.id}` ? '✓ Clé copiée' : '🔑 Copier clé'}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {showModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem',
            backdropFilter: 'blur(4px)',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget && !newApiKey) {
              setShowModal(false);
              setNewApiKey(null);
            }
          }}
        >
          <div
            className="card card-glass"
            style={{
              maxWidth: '500px',
              width: '100%',
              maxHeight: '90vh',
              overflow: 'auto',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {newApiKey ? (
              <>
                <div style={{ marginBottom: '1.5rem' }}>
                  <h3 style={{ margin: 0, color: '#22c55e', marginBottom: '0.5rem' }}>
                    ✅ Clé API créée avec succès !
                  </h3>
                    <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginBottom: '0.5rem' }}>
                    ⚠️ <strong>IMPORTANT :</strong> Copiez cette clé maintenant. Vous ne pourrez plus la voir après. 
                  </p>
                  <div style={{
                    padding: '0.75rem',
                    background: 'rgba(251, 191, 36, 0.2)',
                    border: '1px solid rgba(251, 191, 36, 0.4)',
                    borderRadius: '6px',
                    marginTop: '0.75rem',
                  }}>
                    <p style={{ margin: 0, fontSize: '0.85rem', color: '#fbbf24', fontWeight: '600' }}>
                      💡 Cette clé complète (~43 caractères, format base64url) est différente de l'ID affiché dans le tableau. 
                      Utilisez cette clé complète dans votre SDK, pas l'ID UUID.
                    </p>
                  </div>
                </div>
                <div
                  style={{
                    background: 'rgba(15, 23, 42, 0.9)',
                    border: '1.5px solid rgba(148, 163, 184, 0.25)',
                    borderRadius: '8px',
                    padding: '1rem',
                    marginBottom: '1.5rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', marginBottom: '0.75rem' }}>
                    <code
                      style={{
                        flex: 1,
                        fontFamily: 'monospace',
                        fontSize: '0.85rem',
                        color: '#e2e8f0',
                        wordBreak: 'break-all',
                        padding: '0.75rem',
                        background: 'rgba(0, 0, 0, 0.3)',
                        borderRadius: '6px',
                      }}
                    >
                      {newApiKey}
                    </code>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(newApiKey);
                        alert('Clé API copiée !');
                      }}
                      style={{
                        padding: '0.5rem 1rem',
                        borderRadius: '6px',
                        border: '1px solid rgba(148, 163, 184, 0.3)',
                        background: 'rgba(139, 92, 246, 0.15)',
                        color: '#c4b5fd',
                        cursor: 'pointer',
                        fontSize: '0.85rem',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      📋 Copier
                    </button>
                  </div>
                  <div
                    style={{
                      padding: '1rem',
                      background: 'rgba(251, 191, 36, 0.15)',
                      border: '1px solid rgba(251, 191, 36, 0.3)',
                      borderRadius: '6px',
                    }}
                  >
                      <p style={{ margin: 0, fontSize: '0.85rem', color: '#fde68a' }}>
                      ⚠️ <strong>Important :</strong> Cette clé ne sera affichée qu'une seule fois.
                      Assurez-vous de la copier et de la stocker en sécurité. C'est cette clé complète (format: base64url, ~43 caractères) qu'il faut utiliser dans votre SDK, pas l'ID de la clé.
                    </p>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false);
                      setNewApiKey(null);
                    }}
                    style={{
                      padding: '0.75rem 1.5rem',
                      borderRadius: '8px',
                      border: '1px solid rgba(148, 163, 184, 0.3)',
                      background: 'transparent',
                      color: '#e2e8f0',
                      cursor: 'pointer',
                      fontWeight: '600',
                    }}
                  >
                    Fermer
                  </button>
                </div>
              </>
            ) : (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                  <h3 style={{ margin: 0 }}>Créer une nouvelle clé API</h3>
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: '#94a3b8',
                      cursor: 'pointer',
                      fontSize: '1.5rem',
                      padding: '0.5rem',
                    }}
                  >
                    ×
                  </button>
                </div>
                <div className="form-group">
                  <label className="form-label">Label (optionnel)</label>
                  <input
                    type="text"
                    value={label}
                    onChange={(e) => setLabel(e.target.value)}
                    placeholder="Ex: Production, Development, SDK Integration"
                    className="form-input"
                    style={{
                      padding: '0.875rem 1rem',
                      background: 'rgba(15, 23, 42, 0.9)',
                      border: '1.5px solid rgba(148, 163, 184, 0.25)',
                      borderRadius: '8px',
                      color: '#f1f5f9',
                      fontSize: '0.95rem',
                      width: '100%',
                    }}
                  />
                  <small style={{ display: 'block', marginTop: '0.5rem', color: '#94a3b8', fontSize: '0.85rem' }}>
                    Un label vous aidera à identifier cette clé plus tard
                  </small>
                </div>
                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    style={{
                      padding: '0.75rem 1.5rem',
                      borderRadius: '8px',
                      border: '1px solid rgba(148, 163, 184, 0.3)',
                      background: 'transparent',
                      color: '#e2e8f0',
                      cursor: 'pointer',
                      fontWeight: '600',
                    }}
                  >
                    Annuler
                  </button>
                  <button
                    type="button"
                    onClick={handleCreate}
                    disabled={creating}
                    style={{
                      padding: '0.75rem 1.5rem',
                      borderRadius: '8px',
                      background: creating
                        ? 'rgba(139, 92, 246, 0.3)'
                        : 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                      border: 'none',
                      color: '#ffffff',
                      cursor: creating ? 'not-allowed' : 'pointer',
                      fontWeight: '600',
                      opacity: creating ? 0.6 : 1,
                    }}
                  >
                    {creating ? 'Création...' : 'Créer la clé'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}

