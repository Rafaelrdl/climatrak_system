"""
Text Chunking for AI Knowledge Base (AI-006).

Divide texto em chunks para indexação e busca.
Implementa chunking com overlap para manter contexto.
"""

import logging
import re
from dataclasses import dataclass
from typing import Iterator, List

logger = logging.getLogger(__name__)


@dataclass
class TextChunk:
    """
    Representa um chunk de texto.

    Attributes:
        index: Índice sequencial do chunk (0-based)
        content: Conteúdo do chunk
        char_start: Posição inicial no texto original
        char_end: Posição final no texto original
    """

    index: int
    content: str
    char_start: int
    char_end: int

    @property
    def char_count(self) -> int:
        """Quantidade de caracteres no chunk."""
        return len(self.content)


class TextChunker:
    """
    Divide texto em chunks com overlap.

    Estratégia:
    1. Tenta quebrar em parágrafos
    2. Se parágrafo muito grande, quebra em sentenças
    3. Se sentença muito grande, quebra em palavras

    Sempre mantém overlap entre chunks para contexto.
    """

    # Configurações padrão
    DEFAULT_MIN_CHUNK_SIZE = 1200
    DEFAULT_MAX_CHUNK_SIZE = 1800
    DEFAULT_OVERLAP = 200

    # Regex para detecção de limites
    PARAGRAPH_PATTERN = re.compile(r"\n\s*\n")
    SENTENCE_PATTERN = re.compile(r"(?<=[.!?])\s+(?=[A-Z])")

    def __init__(
        self,
        min_chunk_size: int = None,
        max_chunk_size: int = None,
        overlap: int = None,
    ):
        """
        Args:
            min_chunk_size: Tamanho mínimo do chunk (default: 1200 chars)
            max_chunk_size: Tamanho máximo do chunk (default: 1800 chars)
            overlap: Overlap entre chunks (default: 200 chars)
        """
        self.min_chunk_size = min_chunk_size or self.DEFAULT_MIN_CHUNK_SIZE
        self.max_chunk_size = max_chunk_size or self.DEFAULT_MAX_CHUNK_SIZE
        self.overlap = overlap or self.DEFAULT_OVERLAP

        # Validações
        if self.min_chunk_size > self.max_chunk_size:
            raise ValueError("min_chunk_size cannot be greater than max_chunk_size")
        if self.overlap >= self.min_chunk_size:
            raise ValueError("overlap must be less than min_chunk_size")

    def chunk(self, text: str) -> List[TextChunk]:
        """
        Divide texto em chunks.

        Args:
            text: Texto para dividir

        Returns:
            Lista de TextChunk ordenados por índice
        """
        if not text or not text.strip():
            return []

        chunks = list(self._chunk_generator(text))
        logger.debug(f"Generated {len(chunks)} chunks from {len(text)} chars")
        return chunks

    def _chunk_generator(self, text: str) -> Iterator[TextChunk]:
        """
        Generator que produz chunks do texto.

        Usa estratégia hierárquica:
        1. Agrupa parágrafos até atingir min_chunk_size
        2. Se parágrafo único excede max_chunk_size, divide em sentenças
        3. Se sentença única excede max_chunk_size, divide em palavras
        """
        # Divide em parágrafos
        paragraphs = self._split_paragraphs(text)

        chunk_index = 0
        current_chunk = []
        current_size = 0
        chunk_start = 0
        text_pos = 0

        for para in paragraphs:
            para_size = len(para)

            # Se parágrafo cabe no chunk atual
            if current_size + para_size <= self.max_chunk_size:
                current_chunk.append(para)
                current_size += para_size + 2  # +2 para \n\n entre parágrafos
                text_pos += para_size + 2

            # Se parágrafo não cabe mas chunk já atingiu tamanho mínimo
            elif current_size >= self.min_chunk_size:
                # Emite chunk atual
                chunk_content = "\n\n".join(current_chunk)
                yield TextChunk(
                    index=chunk_index,
                    content=chunk_content,
                    char_start=chunk_start,
                    char_end=chunk_start + len(chunk_content),
                )
                chunk_index += 1

                # Calcula overlap - pega últimas palavras do chunk anterior
                overlap_text = self._get_overlap_text(chunk_content)
                chunk_start = text_pos - len(overlap_text)

                # Inicia novo chunk com overlap + parágrafo atual
                if para_size <= self.max_chunk_size:
                    current_chunk = [overlap_text, para] if overlap_text else [para]
                    current_size = len(overlap_text) + para_size + 2
                else:
                    # Parágrafo muito grande, precisa subdividir
                    current_chunk = [overlap_text] if overlap_text else []
                    current_size = len(overlap_text)
                    for sub_chunk in self._split_large_text(para):
                        if current_size + len(sub_chunk) <= self.max_chunk_size:
                            current_chunk.append(sub_chunk)
                            current_size += len(sub_chunk) + 1
                        else:
                            if current_size >= self.min_chunk_size:
                                chunk_content = " ".join(current_chunk)
                                yield TextChunk(
                                    index=chunk_index,
                                    content=chunk_content,
                                    char_start=chunk_start,
                                    char_end=chunk_start + len(chunk_content),
                                )
                                chunk_index += 1
                                overlap_text = self._get_overlap_text(chunk_content)
                                chunk_start += len(chunk_content) - len(overlap_text)
                                current_chunk = [overlap_text, sub_chunk] if overlap_text else [sub_chunk]
                                current_size = len(overlap_text) + len(sub_chunk) + 1

                text_pos += para_size + 2

            # Parágrafo muito grande e chunk vazio/pequeno
            else:
                # Subdivide o parágrafo
                for sub_chunk in self._split_large_text(para):
                    if current_size + len(sub_chunk) <= self.max_chunk_size:
                        current_chunk.append(sub_chunk)
                        current_size += len(sub_chunk) + 1
                    else:
                        if current_chunk:
                            chunk_content = " ".join(current_chunk)
                            yield TextChunk(
                                index=chunk_index,
                                content=chunk_content,
                                char_start=chunk_start,
                                char_end=chunk_start + len(chunk_content),
                            )
                            chunk_index += 1
                            overlap_text = self._get_overlap_text(chunk_content)
                            chunk_start += len(chunk_content) - len(overlap_text)
                            current_chunk = [overlap_text, sub_chunk] if overlap_text else [sub_chunk]
                            current_size = len(overlap_text) + len(sub_chunk) + 1
                        else:
                            current_chunk = [sub_chunk]
                            current_size = len(sub_chunk)
                text_pos += para_size + 2

        # Emite último chunk se houver conteúdo
        if current_chunk:
            chunk_content = "\n\n".join(current_chunk) if len(current_chunk) > 1 else current_chunk[0]
            yield TextChunk(
                index=chunk_index,
                content=chunk_content,
                char_start=chunk_start,
                char_end=chunk_start + len(chunk_content),
            )

    def _split_paragraphs(self, text: str) -> List[str]:
        """Divide texto em parágrafos."""
        paragraphs = self.PARAGRAPH_PATTERN.split(text)
        return [p.strip() for p in paragraphs if p.strip()]

    def _split_sentences(self, text: str) -> List[str]:
        """Divide texto em sentenças."""
        sentences = self.SENTENCE_PATTERN.split(text)
        return [s.strip() for s in sentences if s.strip()]

    def _split_large_text(self, text: str) -> Iterator[str]:
        """
        Divide texto grande em partes menores.

        Tenta manter sentenças inteiras, se possível.
        """
        if len(text) <= self.max_chunk_size:
            yield text
            return

        # Tenta dividir em sentenças
        sentences = self._split_sentences(text)

        if len(sentences) > 1:
            current_part = []
            current_size = 0

            for sentence in sentences:
                if current_size + len(sentence) <= self.max_chunk_size:
                    current_part.append(sentence)
                    current_size += len(sentence) + 1
                else:
                    if current_part:
                        yield " ".join(current_part)
                    if len(sentence) > self.max_chunk_size:
                        # Sentença muito grande, divide por palavras
                        yield from self._split_by_words(sentence)
                        current_part = []
                        current_size = 0
                    else:
                        current_part = [sentence]
                        current_size = len(sentence)

            if current_part:
                yield " ".join(current_part)
        else:
            # Texto sem sentenças claras, divide por palavras
            yield from self._split_by_words(text)

    def _split_by_words(self, text: str) -> Iterator[str]:
        """Divide texto por palavras, respeitando tamanho máximo."""
        words = text.split()
        current_part = []
        current_size = 0

        for word in words:
            word_size = len(word) + 1  # +1 para espaço

            if current_size + word_size <= self.max_chunk_size:
                current_part.append(word)
                current_size += word_size
            else:
                if current_part:
                    yield " ".join(current_part)
                current_part = [word]
                current_size = word_size

        if current_part:
            yield " ".join(current_part)

    def _get_overlap_text(self, text: str) -> str:
        """
        Extrai texto de overlap do final do chunk.

        Tenta manter palavras completas.
        """
        if len(text) <= self.overlap:
            return text

        # Pega últimos N caracteres
        overlap_text = text[-self.overlap:]

        # Encontra início da primeira palavra completa
        space_pos = overlap_text.find(" ")
        if space_pos > 0:
            overlap_text = overlap_text[space_pos + 1:]

        return overlap_text


def chunk_text(
    text: str,
    min_size: int = None,
    max_size: int = None,
    overlap: int = None,
) -> List[TextChunk]:
    """
    Função utilitária para dividir texto em chunks.

    Args:
        text: Texto para dividir
        min_size: Tamanho mínimo do chunk
        max_size: Tamanho máximo do chunk
        overlap: Overlap entre chunks

    Returns:
        Lista de TextChunk
    """
    chunker = TextChunker(
        min_chunk_size=min_size,
        max_chunk_size=max_size,
        overlap=overlap,
    )
    return chunker.chunk(text)
