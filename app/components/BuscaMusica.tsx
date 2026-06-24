"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"

interface Resultado {
  titulo: string
  artista: string
  url: string
  slug: string
}

export default function BuscaMusica() {
  const [query, setQuery] = useState("")
  const [resultados, setResultados] = useState<Resultado[]>([])
  const [carregando, setCarregando] = useState(false)
  const [aberto, setAberto] = useState(false)
  const [erro, setErro] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const router = useRouter()

  const buscar = useCallback(async (q: string) => {
    if (q.length < 2) {
      setResultados([])
      setAberto(false)
      return
    }
    setCarregando(true)
    setErro("")
    try {
      const res = await fetch(`/api/buscar?q=${encodeURIComponent(q)}`)
      const data = await res.json()
      setResultados(data.resultados || [])
      setAberto(true)
    } catch {
      setErro("Erro ao buscar. Tente novamente.")
      setResultados([])
    } finally {
      setCarregando(false)
    }
  }, [])

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    if (query.length < 2) {
      setResultados([])
      setAberto(false)
      return
    }
    timerRef.current = setTimeout(() => buscar(query), 400)
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [query, buscar])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setAberto(false)
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [])

  function handleSelect(resultado: Resultado) {
    setAberto(false)
    setQuery("")
    // Salva no histórico local (mesmo padrão do app atual)
    try {
      const historico = JSON.parse(localStorage.getItem("historico_musicas") || "[]")
      const nova = {
        id: resultado.slug,
        titulo: resultado.titulo,
        artista: resultado.artista,
        url: resultado.url,
        acessadaEm: new Date().toISOString(),
      }
      const atualizado = [nova, ...historico.filter((m: { id: string }) => m.id !== nova.id)].slice(0, 20)
      localStorage.setItem("historico_musicas", JSON.stringify(atualizado))
    } catch {}
    // Navega para a página da música (mesmo padrão de /musica/[id])
    const id = encodeURIComponent(resultado.slug)
    router.push(`/musica/${id}`)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") {
      setAberto(false)
      inputRef.current?.blur()
    }
  }

  return (
    <div ref={containerRef} style={{ position: "relative", width: "100%" }}>
      {/* Campo de busca */}
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: "10px",
        background: "var(--color-background-primary, #fff)",
        border: "1.5px solid var(--color-border-secondary, #ddd)",
        borderRadius: "12px",
        padding: "10px 16px",
        transition: "border-color 0.2s",
      }}>
        <span style={{ fontSize: "20px", flexShrink: 0 }}>🔍</span>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => resultados.length > 0 && setAberto(true)}
          placeholder="Buscar música ou artista..."
          style={{
            flex: 1,
            border: "none",
            outline: "none",
            background: "transparent",
            fontSize: "16px",
            color: "var(--color-text-primary, #111)",
          }}
        />
        {carregando && (
          <div style={{
            width: "18px", height: "18px", flexShrink: 0,
            border: "2px solid var(--color-border-tertiary, #eee)",
            borderTopColor: "var(--color-text-secondary, #666)",
            borderRadius: "50%",
            animation: "tc-spin 0.7s linear infinite",
          }} />
        )}
        {query && !carregando && (
          <button
            onClick={() => { setQuery(""); setResultados([]); setAberto(false) }}
            style={{
              background: "none", border: "none", cursor: "pointer",
              fontSize: "18px", color: "var(--color-text-secondary, #888)",
              flexShrink: 0, padding: "0",
            }}
            aria-label="Limpar busca"
          >✕</button>
        )}
      </div>

      {/* Dropdown de resultados */}
      {aberto && (resultados.length > 0 || erro) && (
        <div style={{
          position: "absolute",
          top: "calc(100% + 6px)",
          left: 0, right: 0,
          background: "var(--color-background-primary, #fff)",
          border: "1px solid var(--color-border-tertiary, #eee)",
          borderRadius: "12px",
          boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
          overflow: "hidden",
          zIndex: 1000,
        }}>
          {erro && (
            <div style={{ padding: "14px 16px", fontSize: "14px", color: "var(--color-text-secondary, #888)" }}>
              {erro}
            </div>
          )}
          {resultados.map((r, i) => (
            <button
              key={i}
              onClick={() => handleSelect(r)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                width: "100%",
                padding: "12px 16px",
                background: "none",
                border: "none",
                borderTop: i > 0 ? "1px solid var(--color-border-tertiary, #f0f0f0)" : "none",
                cursor: "pointer",
                textAlign: "left",
                transition: "background 0.15s",
              }}
              onMouseEnter={e => (e.currentTarget.style.background = "var(--color-background-secondary, #f5f5f5)")}
              onMouseLeave={e => (e.currentTarget.style.background = "none")}
            >
              <span style={{ fontSize: "22px", flexShrink: 0 }}>🎵</span>
              <div style={{ flex: 1, overflow: "hidden" }}>
                <div style={{
                  fontSize: "15px", fontWeight: "500",
                  color: "var(--color-text-primary, #111)",
                  whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                }}>
                  {r.titulo}
                </div>
                <div style={{
                  fontSize: "13px",
                  color: "var(--color-text-secondary, #888)",
                  whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                }}>
                  {r.artista}
                </div>
              </div>
              <span style={{ fontSize: "13px", color: "var(--color-text-secondary, #aaa)", flexShrink: 0 }}>→</span>
            </button>
          ))}
          {resultados.length === 0 && !erro && !carregando && query.length >= 2 && (
            <div style={{ padding: "14px 16px", fontSize: "14px", color: "var(--color-text-secondary, #888)" }}>
              Nenhuma música encontrada para "{query}"
            </div>
          )}
        </div>
      )}

      <style>{`
        @keyframes tc-spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}
