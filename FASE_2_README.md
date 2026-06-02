# 🚀 FASE 2 - Monitor + Bloques

[![Python](https://img.shields.io/badge/Python-3.7+-blue.svg)](https://python.org)
[![Status](https://img.shields.io/badge/Estado-Completado-green.svg)]()

---

## 📌 Descripción

Monitor que carga transacciones, las agrupa en bloques y las distribuye a validadores.

**Funciones:**
- 📂 Carga transacciones desde archivo
- 🔗 Agrupa en bloques con hash SHA-256
- 📤 Distribuye bloques por mensajes privados (/w)
- 📒 Mantiene blockchain local

---

## 📦 Entregables

| Archivo | Qué hace |
|---------|----------|
| `bloque.py` | Clase Bloque con hash |
| `monitor.py` | Nodo Monitor |
| `bloques.txt` | Transacciones de ejemplo |
| `FASE_2_README.md` | Esta documentación |

---

## ▶️ Cómo ejecutar

### 1. Iniciar servidor (Fase 1)
```bash
python servidor.py

