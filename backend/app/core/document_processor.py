"""
文档处理模块 - 支持多种格式文档的解析和清洗
"""

from pathlib import Path
from typing import List, Dict, Any
import fitz  # PyMuPDF
from docx import Document as DocxDocument
import openpyxl
from loguru import logger
import re


class DocumentProcessor:
    """文档处理器"""
    
    @staticmethod
    def process_pdf(file_path: Path) -> str:
        """处理 PDF 文件"""
        try:
            doc = fitz.open(file_path)
            text = ""
            for page in doc:
                text += page.get_text()
            doc.close()
            return DocumentProcessor.clean_text(text)
        except Exception as e:
            logger.error(f"PDF 处理失败: {e}")
            raise
    
    @staticmethod
    def process_docx(file_path: Path) -> str:
        """处理 Word 文档"""
        try:
            doc = DocxDocument(file_path)
            text = "\n".join([para.text for para in doc.paragraphs])
            return DocumentProcessor.clean_text(text)
        except Exception as e:
            logger.error(f"DOCX 处理失败: {e}")
            raise
    
    @staticmethod
    def process_excel(file_path: Path) -> str:
        """处理 Excel 文件"""
        try:
            wb = openpyxl.load_workbook(file_path, read_only=True)
            text = ""
            for sheet in wb.worksheets:
                for row in sheet.iter_rows(values_only=True):
                    row_text = " | ".join([str(cell) if cell else "" for cell in row])
                    text += row_text + "\n"
            wb.close()
            return DocumentProcessor.clean_text(text)
        except Exception as e:
            logger.error(f"Excel 处理失败: {e}")
            raise
    
    @staticmethod
    def process_txt(file_path: Path) -> str:
        """处理纯文本文件"""
        try:
            with open(file_path, "r", encoding="utf-8") as f:
                text = f.read()
            return DocumentProcessor.clean_text(text)
        except UnicodeDecodeError:
            # 尝试其他编码
            try:
                with open(file_path, "r", encoding="gbk") as f:
                    text = f.read()
                return DocumentProcessor.clean_text(text)
            except Exception as e:
                logger.error(f"文本文件处理失败: {e}")
                raise
    
    @staticmethod
    def process_markdown(file_path: Path) -> str:
        """处理 Markdown 文件"""
        return DocumentProcessor.process_txt(file_path)
    
    @staticmethod
    def clean_text(text: str) -> str:
        """清洗文本"""
        # 移除多余的空白字符
        text = re.sub(r'\s+', ' ', text)
        # 移除特殊字符
        text = re.sub(r'[\x00-\x08\x0b-\x0c\x0e-\x1f\x7f-\x9f]', '', text)
        # 移除多余的换行
        text = re.sub(r'\n\s*\n', '\n\n', text)
        return text.strip()
    
    @staticmethod
    def chunk_text(text: str, chunk_size: int = 512, overlap: int = 50) -> List[str]:
        """分块文本"""
        words = text.split()
        chunks = []
        
        for i in range(0, len(words), chunk_size - overlap):
            chunk = " ".join(words[i:i + chunk_size])
            if chunk:
                chunks.append(chunk)
        
        return chunks
    
    @classmethod
    def process_document(cls, file_path: Path) -> Dict[str, Any]:
        """
        处理文档（主入口）
        
        Returns:
            {
                "text": str,  # 清洗后的完整文本
                "chunks": List[str],  # 分块后的文本
                "metadata": dict  # 元数据
            }
        """
        file_ext = file_path.suffix.lower()
        
        # 根据文件类型调用不同的处理器
        processors = {
            ".pdf": cls.process_pdf,
            ".docx": cls.process_docx,
            ".doc": cls.process_docx,
            ".xlsx": cls.process_excel,
            ".xls": cls.process_excel,
            ".txt": cls.process_txt,
            ".md": cls.process_markdown,
            ".markdown": cls.process_markdown,
        }
        
        processor = processors.get(file_ext)
        if not processor:
            raise ValueError(f"不支持的文件类型: {file_ext}")
        
        # 提取文本
        text = processor(file_path)
        
        # 分块
        from app.core.config import settings
        chunks = cls.chunk_text(text, settings.CHUNK_SIZE, settings.CHUNK_OVERLAP)
        
        logger.info(f"文档处理完成: {file_path.name}, 总字符数: {len(text)}, 分块数: {len(chunks)}")
        
        return {
            "text": text,
            "chunks": chunks,
            "metadata": {
                "filename": file_path.name,
                "file_type": file_ext,
                "char_count": len(text),
                "chunk_count": len(chunks),
            }
        }

