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
    def process_docx(file_path: Path, preserve_structure: bool = True) -> str:
        """
        处理 Word 文档
        
        Args:
            file_path: 文档路径
            preserve_structure: 是否保留段落结构（默认True，适合FAQ等结构化文档）
        """
        try:
            doc = DocxDocument(file_path)
            # 保留段落结构，每个段落用双换行分隔
            text = "\n\n".join([para.text.strip() for para in doc.paragraphs if para.text.strip()])
            return DocumentProcessor.clean_text(text, preserve_structure=preserve_structure)
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
    def clean_text(text: str, preserve_structure: bool = False) -> str:
        """
        清洗文本
        
        Args:
            text: 原始文本
            preserve_structure: 是否保留段落结构（用于FAQ等结构化文档）
        """
        # 移除特殊字符
        text = re.sub(r'[\x00-\x08\x0b-\x0c\x0e-\x1f\x7f-\x9f]', '', text)
        
        if preserve_structure:
            # 保留段落结构，只规范化换行
            text = re.sub(r'\n{3,}', '\n\n', text)  # 多个换行变成两个
            text = re.sub(r'[ \t]+', ' ', text)  # 只清理行内空格
        else:
            # 标准清洗
            text = re.sub(r'\s+', ' ', text)
            text = re.sub(r'\n\s*\n', '\n\n', text)
        
        return text.strip()
    
    @staticmethod
    def chunk_text_faq(text: str) -> List[str]:
        """
        FAQ模式智能分块 - 识别问答对结构
        
        支持两种格式：
        1. 编号格式："数字) 问题？" 或 "数字） 问题？"
        2. 段落格式：以"？"结尾的段落作为问题，后续段落作为答案
        """
        chunks = []
        
        # 方法1：尝试编号格式
        qa_pattern = r'(?:^|\n)(\d+[)）])\s*(.+?)(?=\n\d+[)）]|\Z)'
        matches = list(re.finditer(qa_pattern, text, re.DOTALL | re.MULTILINE))
        
        if matches and len(matches) >= 5:  # 至少5个编号问题才认为是编号格式
            logger.info(f"🎯 检测到编号FAQ格式，识别到 {len(matches)} 个问答对")
            
            for match in matches:
                number = match.group(1)
                content = match.group(2).strip()
                lines = content.split('\n', 1)
                question = lines[0].strip()
                answer = lines[1].strip() if len(lines) > 1 else ""
                
                qa_text = f"Q{number} {question}\n\nA: {answer}" if answer else f"Q{number} {question}"
                chunks.append(qa_text)
                logger.debug(f"  提取QA对 {number}: {question[:50]}...")
        else:
            # 方法2：段落格式 - 识别问句和答案
            paragraphs = text.split('\n\n')
            i = 0
            qa_count = 0
            
            while i < len(paragraphs):
                para = paragraphs[i].strip()
                
                # 跳过标题段落（通常很短，或包含"一、"等标记）
                if len(para) < 10 or re.match(r'^[一二三四五六七八九十]+[、．]', para) or para.endswith('相关'):
                    i += 1
                    continue
                
                # 识别问句（以？结尾，且长度适中）
                if '？' in para and 10 < len(para) < 200:
                    question = para.strip()
                    answer_parts = []
                    
                    # 收集答案段落（直到遇到下一个问题或标题）
                    j = i + 1
                    while j < len(paragraphs):
                        next_para = paragraphs[j].strip()
                        
                        # 遇到新问题或标题则停止
                        if ('？' in next_para and len(next_para) < 200) or \
                           re.match(r'^[一二三四五六七八九十]+[、．]', next_para) or \
                           next_para.endswith('相关'):
                            break
                        
                        if next_para:
                            answer_parts.append(next_para)
                        j += 1
                    
                    # 构建QA对
                    answer = '\n\n'.join(answer_parts) if answer_parts else ""
                    qa_count += 1
                    qa_text = f"Q{qa_count}: {question}\n\nA: {answer}" if answer else f"Q{qa_count}: {question}"
                    chunks.append(qa_text)
                    
                    logger.debug(f"  提取QA对 {qa_count}: {question[:50]}...")
                    i = j
                else:
                    i += 1
            
            if qa_count > 0:
                logger.info(f"🎯 检测到段落FAQ格式，识别到 {qa_count} 个问答对")
            else:
                logger.warning("⚠️ 未检测到FAQ格式，将使用标准分块")
                return []
        
        return chunks
    
    @staticmethod
    def chunk_text(text: str, chunk_size: int = 512, overlap: int = 50, mode: str = "auto") -> List[str]:
        """
        智能分块文本
        
        Args:
            text: 待分块的文本
            chunk_size: 目标块大小（词数）
            overlap: 重叠大小
            mode: 分块模式
                - "auto": 自动检测（优先FAQ，然后标准）
                - "faq": 强制使用FAQ模式
                - "standard": 标准段落分块
        """
        # 模式1：FAQ模式（优先）
        if mode in ["auto", "faq"]:
            faq_chunks = DocumentProcessor.chunk_text_faq(text)
            if faq_chunks:
                logger.info(f"✅ 使用FAQ模式，生成 {len(faq_chunks)} 个问答对")
                return faq_chunks
            elif mode == "faq":
                logger.warning("⚠️ 强制FAQ模式但未检测到格式，回退到标准模式")
        
        # 模式2：标准段落分块
        # 先按段落分割
        paragraphs = re.split(r'\n\s*\n+', text)
        chunks = []
        current_chunk = ""
        current_words = 0
        
        for para in paragraphs:
            para = para.strip()
            if not para:
                continue
                
            para_words = len(para.split())
            
            # 如果当前段落太大，单独分块
            if para_words > chunk_size * 1.5:
                # 先保存当前chunk
                if current_chunk:
                    chunks.append(current_chunk.strip())
                    current_chunk = ""
                    current_words = 0
                
                # 大段落按句子分块
                sentences = re.split(r'[。！？\n]+', para)
                temp_chunk = ""
                temp_words = 0
                
                for sent in sentences:
                    sent = sent.strip()
                    if not sent:
                        continue
                    sent_words = len(sent.split())
                    
                    if temp_words + sent_words > chunk_size:
                        if temp_chunk:
                            chunks.append(temp_chunk.strip())
                        temp_chunk = sent + "。"
                        temp_words = sent_words
                    else:
                        temp_chunk += sent + "。"
                        temp_words += sent_words
                
                if temp_chunk:
                    chunks.append(temp_chunk.strip())
            
            # 如果加上这个段落会超过chunk_size，先保存当前chunk
            elif current_words + para_words > chunk_size:
                if current_chunk:
                    chunks.append(current_chunk.strip())
                current_chunk = para
                current_words = para_words
            else:
                current_chunk += ("\n\n" if current_chunk else "") + para
                current_words += para_words
        
        # 保存最后一个chunk
        if current_chunk:
            chunks.append(current_chunk.strip())
        
        # 确保每个chunk不会太小
        final_chunks = []
        for chunk in chunks:
            if len(chunk.split()) >= 50 or not final_chunks:  # 至少50词
                final_chunks.append(chunk)
            else:
                # 合并到上一个chunk
                final_chunks[-1] += "\n\n" + chunk
        
        return final_chunks
    
    @classmethod
    def process_document(cls, file_path: Path, chunk_mode: str = "auto") -> Dict[str, Any]:
        """
        处理文档（主入口）
        
        Args:
            file_path: 文档路径
            chunk_mode: 分块模式 ("auto", "faq", "standard")
        
        Returns:
            {
                "text": str,  # 清洗后的完整文本
                "chunks": List[str],  # 分块后的文本
                "metadata": dict  # 元数据
                "chunk_mode": str  # 实际使用的分块模式
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
        
        logger.info(f"📄 文档提取完成: {file_path.name}, 总字符数: {len(text)}")
        logger.info(f"🔧 使用分块模式: {chunk_mode}")
        
        # 智能分块
        from app.core.config import settings
        chunks = cls.chunk_text(text, settings.CHUNK_SIZE, settings.CHUNK_OVERLAP, mode=chunk_mode)
        
        # 确定实际使用的模式
        actual_mode = "faq" if (chunk_mode in ["auto", "faq"] and chunks and chunks[0].startswith("Q")) else "standard"
        
        logger.info(f"✅ 文档处理完成: 分块数={len(chunks)}, 实际模式={actual_mode}")
        
        return {
            "text": text,
            "chunks": chunks,
            "metadata": {
                "filename": file_path.name,
                "file_type": file_ext,
                "char_count": len(text),
                "chunk_count": len(chunks),
                "chunk_mode": actual_mode,
            }
        }

