"""
خدمة تصدير التقارير إلى PDF
"""

from flask import Flask, send_file
from reportlab.lib.pagesizes import letter, A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, PageBreak
from reportlab.lib.enums import TA_RIGHT, TA_LEFT, TA_CENTER
from datetime import datetime
import io
from models import Report, Beneficiary, TherapySession, Assessment
from flask_jwt_required import jwt_required
from flask import Blueprint, jsonify

pdf_bp = Blueprint('pdf', __name__, url_prefix='/api/pdf')


class ReportPDFGenerator:
    """فئة لتوليد تقارير PDF"""
    
    def __init__(self, report_id):
        self.report = Report.query.get(report_id)
        if not self.report:
            raise ValueError('التقرير غير موجود')
        
        self.beneficiary = self.report.beneficiary
        self.buffer = io.BytesIO()
        self.page_size = A4
        
    def generate(self):
        """توليد PDF"""
        doc = SimpleDocTemplate(
            self.buffer,
            pagesize=self.page_size,
            rightMargin=20,
            leftMargin=20,
            topMargin=20,
            bottomMargin=20,
            title='تقرير التقييم'
        )
        
        # إنشاء القصة
        story = []
        
        # العنوان
        styles = getSampleStyleSheet()
        title_style = ParagraphStyle(
            'CustomTitle',
            parent=styles['Heading1'],
            fontSize=24,
            textColor=colors.HexColor('#667eea'),
            spaceAfter=30,
            alignment=TA_CENTER,
            fontName='Helvetica-Bold'
        )
        
        story.append(Paragraph('نظام إدارة مراكز التأهيل', title_style))
        story.append(Paragraph('تقرير التقييم الشامل', title_style))
        story.append(Spacer(1, 0.5*inch))
        
        # معلومات المستفيد
        story.append(self._create_beneficiary_section())
        story.append(Spacer(1, 0.3*inch))
        
        # معلومات التقرير
        story.append(self._create_report_section())
        story.append(Spacer(1, 0.3*inch))
        
        # الجلسات ذات الصلة
        story.append(self._create_sessions_section())
        story.append(Spacer(1, 0.3*inch))
        
        # التقييمات
        story.append(self._create_assessments_section())
        story.append(Spacer(1, 0.3*inch))
        
        # التوصيات
        story.append(self._create_recommendations_section())
        
        # بناء الوثيقة
        doc.build(story)
        self.buffer.seek(0)
        return self.buffer
    
    def _create_beneficiary_section(self):
        """إنشاء قسم بيانات المستفيد"""
        styles = getSampleStyleSheet()
        
        title_style = ParagraphStyle(
            'SectionTitle',
            parent=styles['Heading2'],
            fontSize=14,
            textColor=colors.HexColor('#667eea'),
            spaceAfter=10,
            fontName='Helvetica-Bold'
        )
        
        story = []
        story.append(Paragraph('بيانات المستفيد', title_style))
        
        # جدول البيانات
        data = [
            ['الاسم الكامل', f'{self.beneficiary.first_name} {self.beneficiary.last_name}'],
            ['تاريخ الميلاد', str(self.beneficiary.date_of_birth)],
            ['الجنس', 'ذكر' if self.beneficiary.gender == 'M' else 'أنثى'],
            ['نوع الإعاقة', self.beneficiary.disability_type],
            ['تصنيف الإعاقة', self.beneficiary.disability_category],
            ['درجة الشدة', self.beneficiary.severity_level],
            ['رقم الهاتف', self.beneficiary.phone or 'غير متوفر'],
            ['البريد الإلكتروني', self.beneficiary.email or 'غير متوفر'],
            ['العنوان', self.beneficiary.address or 'غير متوفر'],
            ['ولي الأمر', self.beneficiary.guardian_name or 'غير متوفر'],
        ]
        
        table = Table(data, colWidths=[2*inch, 4*inch])
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#f5f5f5')),
            ('TEXTCOLOR', (0, 0), (-1, -1), colors.black),
            ('ALIGN', (0, 0), (-1, -1), 'RIGHT'),
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 12),
            ('GRID', (0, 0), (-1, -1), 1, colors.grey),
        ]))
        
        story.append(table)
        return story[0] if len(story) == 1 else story
    
    def _create_report_section(self):
        """إنشاء قسم بيانات التقرير"""
        styles = getSampleStyleSheet()
        
        title_style = ParagraphStyle(
            'SectionTitle',
            parent=styles['Heading2'],
            fontSize=14,
            textColor=colors.HexColor('#667eea'),
            spaceAfter=10,
            fontName='Helvetica-Bold'
        )
        
        body_style = ParagraphStyle(
            'BodyStyle',
            parent=styles['BodyText'],
            alignment=TA_RIGHT,
            fontSize=11,
            spaceAfter=10
        )
        
        story = []
        story.append(Paragraph('بيانات التقرير', title_style))
        
        data = [
            ['عنوان التقرير', self.report.title],
            ['نوع التقرير', self.report.report_type],
            ['تاريخ التقرير', str(self.report.report_date)],
            ['الحالة', self.report.status],
        ]
        
        table = Table(data, colWidths=[2*inch, 4*inch])
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#f5f5f5')),
            ('TEXTCOLOR', (0, 0), (-1, -1), colors.black),
            ('ALIGN', (0, 0), (-1, -1), 'RIGHT'),
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 12),
            ('GRID', (0, 0), (-1, -1), 1, colors.grey),
        ]))
        
        story.append(table)
        story.append(Spacer(1, 0.2*inch))
        
        # الملخص
        story.append(Paragraph('الملخص', ParagraphStyle(
            'SubTitle',
            parent=styles['Heading3'],
            fontSize=12,
            fontName='Helvetica-Bold',
            spaceAfter=5
        )))
        story.append(Paragraph(self.report.summary or 'لا يوجد', body_style))
        
        # الوصف
        story.append(Paragraph('الوصف التفصيلي', ParagraphStyle(
            'SubTitle',
            parent=styles['Heading3'],
            fontSize=12,
            fontName='Helvetica-Bold',
            spaceAfter=5
        )))
        story.append(Paragraph(self.report.description or 'لا يوجد', body_style))
        
        return story
    
    def _create_sessions_section(self):
        """إنشاء قسم الجلسات"""
        styles = getSampleStyleSheet()
        
        title_style = ParagraphStyle(
            'SectionTitle',
            parent=styles['Heading2'],
            fontSize=14,
            textColor=colors.HexColor('#667eea'),
            spaceAfter=10,
            fontName='Helvetica-Bold'
        )
        
        story = []
        story.append(Paragraph('الجلسات المتعلقة', title_style))
        
        sessions = TherapySession.query.filter_by(
            beneficiary_id=self.beneficiary.id
        ).limit(5).all()
        
        if sessions:
            data = [['التاريخ', 'النوع', 'الحالة', 'المدة']]
            for session in sessions:
                data.append([
                    str(session.session_date),
                    session.session_type,
                    session.status,
                    f"{session.duration_minutes} دقيقة"
                ])
            
            table = Table(data, colWidths=[1.5*inch, 1.5*inch, 1.5*inch, 1.5*inch])
            table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#667eea')),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, 0), 10),
                ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
                ('GRID', (0, 0), (-1, -1), 1, colors.grey),
            ]))
            story.append(table)
        else:
            story.append(Paragraph('لا توجد جلسات متعلقة', styles['Normal']))
        
        return story
    
    def _create_assessments_section(self):
        """إنشاء قسم التقييمات"""
        styles = getSampleStyleSheet()
        
        title_style = ParagraphStyle(
            'SectionTitle',
            parent=styles['Heading2'],
            fontSize=14,
            textColor=colors.HexColor('#667eea'),
            spaceAfter=10,
            fontName='Helvetica-Bold'
        )
        
        story = []
        story.append(Paragraph('التقييمات', title_style))
        
        assessments = Assessment.query.filter_by(
            beneficiary_id=self.beneficiary.id
        ).limit(5).all()
        
        if assessments:
            data = [['نوع التقييم', 'الأداة', 'التاريخ', 'الدرجة']]
            for assessment in assessments:
                data.append([
                    assessment.assessment_type,
                    assessment.assessment_tool,
                    str(assessment.assessment_date),
                    str(assessment.total_score)
                ])
            
            table = Table(data, colWidths=[1.5*inch, 1.5*inch, 1.5*inch, 1.5*inch])
            table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#667eea')),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, 0), 10),
                ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
                ('GRID', (0, 0), (-1, -1), 1, colors.grey),
            ]))
            story.append(table)
        else:
            story.append(Paragraph('لا توجد تقييمات', styles['Normal']))
        
        return story
    
    def _create_recommendations_section(self):
        """إنشاء قسم التوصيات"""
        styles = getSampleStyleSheet()
        
        title_style = ParagraphStyle(
            'SectionTitle',
            parent=styles['Heading2'],
            fontSize=14,
            textColor=colors.HexColor('#667eea'),
            spaceAfter=10,
            fontName='Helvetica-Bold'
        )
        
        body_style = ParagraphStyle(
            'BodyStyle',
            parent=styles['BodyText'],
            alignment=TA_RIGHT,
            fontSize=11,
            spaceAfter=10
        )
        
        story = []
        story.append(Paragraph('التوصيات', title_style))
        
        if self.report.recommendations:
            story.append(Paragraph(self.report.recommendations, body_style))
        else:
            story.append(Paragraph('لا توجد توصيات', styles['Normal']))
        
        # التوقيع
        story.append(Spacer(1, 0.5*inch))
        story.append(Paragraph('_' * 50, styles['Normal']))
        story.append(Paragraph('التوقيع والختم', ParagraphStyle(
            'Signature',
            parent=styles['Normal'],
            alignment=TA_CENTER,
            spaceAfter=5
        )))
        story.append(Paragraph(datetime.now().strftime('%Y-%m-%d'), ParagraphStyle(
            'Date',
            parent=styles['Normal'],
            alignment=TA_CENTER
        )))
        
        return story


@pdf_bp.route('/report/<int:report_id>', methods=['GET'])
@jwt_required()
def export_report_pdf(report_id):
    """تصدير التقرير إلى PDF"""
    try:
        generator = ReportPDFGenerator(report_id)
        pdf_buffer = generator.generate()
        
        return send_file(
            pdf_buffer,
            mimetype='application/pdf',
            as_attachment=True,
            download_name=f'report_{report_id}.pdf'
        )
    except Exception as e:
        return jsonify({'error': str(e)}), 400


@pdf_bp.route('/session/<int:session_id>', methods=['GET'])
@jwt_required()
def export_session_pdf(session_id):
    """تصدير بيانات الجلسة إلى PDF"""
    try:
        session = TherapySession.query.get(session_id)
        if not session:
            return jsonify({'error': 'الجلسة غير موجودة'}), 404
        
        # توليد PDF بسيط
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=A4)
        story = []
        
        styles = getSampleStyleSheet()
        story.append(Paragraph('بيانات الجلسة', styles['Heading1']))
        story.append(Spacer(1, 0.3*inch))
        
        data = [
            ['التاريخ', str(session.session_date)],
            ['الوقت', str(session.session_time)],
            ['النوع', session.session_type],
            ['الحالة', session.status],
            ['المدة', f"{session.duration_minutes} دقيقة"],
            ['الأهداف', session.objectives or 'لا يوجد'],
            ['الملاحظات', session.notes or 'لا يوجد'],
        ]
        
        table = Table(data)
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#f5f5f5')),
            ('GRID', (0, 0), (-1, -1), 1, colors.grey),
        ]))
        story.append(table)
        
        doc.build(story)
        buffer.seek(0)
        
        return send_file(
            buffer,
            mimetype='application/pdf',
            as_attachment=True,
            download_name=f'session_{session_id}.pdf'
        )
    except Exception as e:
        return jsonify({'error': str(e)}), 500
