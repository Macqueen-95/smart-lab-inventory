"""
PDF Report Generation for Audit Reports
"""
from reportlab.lib.pagesizes import letter, A4
from reportlab.lib import colors
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, PageBreak
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from datetime import datetime
import io


def generate_audit_pdf(report_data):
    """
    Generate a PDF report from audit report data.
    
    Args:
        report_data: Dictionary containing audit report data with keys:
            - audit: Audit details (id, scheduled_date, room_name, floor_title, etc.)
            - summary: Summary statistics
            - missing_items: List of missing items
            - in_service_items: List of items in service
            - borrowed_items: List of borrowed items
            - unexpected_items: List of unexpected items
    
    Returns:
        BytesIO buffer containing the PDF
    """
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter, topMargin=0.5*inch, bottomMargin=0.5*inch)
    
    # Container for the 'Flowable' objects
    elements = []
    
    # Define styles
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=24,
        textColor=colors.HexColor('#1e40af'),
        spaceAfter=30,
        alignment=TA_CENTER,
    )
    
    heading_style = ParagraphStyle(
        'CustomHeading',
        parent=styles['Heading2'],
        fontSize=16,
        textColor=colors.HexColor('#1e40af'),
        spaceAfter=12,
        spaceBefore=12,
    )
    
    normal_style = styles['Normal']
    normal_style.fontSize = 10
    
    # Title
    elements.append(Paragraph("AUDIT REPORT", title_style))
    elements.append(Spacer(1, 0.2*inch))
    
    # Audit Information
    audit = report_data.get('audit', {})
    audit_info_data = [
        ['Audit ID:', str(audit.get('id', 'N/A'))],
        ['Scheduled Date:', audit.get('scheduled_date', 'N/A')],
        ['Room:', audit.get('room_name', 'N/A')],
        ['Floor:', audit.get('floor_title', 'N/A')],
        ['Status:', audit.get('status', 'N/A')],
        ['Scanner ID:', audit.get('scanner_id', 'N/A')],
    ]
    
    if audit.get('started_at'):
        audit_info_data.append(['Started At:', audit['started_at']])
    if audit.get('completed_at'):
        audit_info_data.append(['Completed At:', audit['completed_at']])
    
    audit_info_table = Table(audit_info_data, colWidths=[2*inch, 4*inch])
    audit_info_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#e5e7eb')),
        ('TEXTCOLOR', (0, 0), (-1, -1), colors.black),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('GRID', (0, 0), (-1, -1), 1, colors.grey),
    ]))
    
    elements.append(audit_info_table)
    elements.append(Spacer(1, 0.3*inch))
    
    # Summary Statistics
    summary = report_data.get('summary', {})
    summary_data = [
        ['Metric', 'Count'],
        ['Total Expected', str(summary.get('total_expected', 0))],
        ['Scanned', str(summary.get('scanned', 0))],
        ['Missing', str(summary.get('missing', 0))],
        ['In Service', str(summary.get('in_service', 0))],
        ['Borrowed', str(summary.get('borrowed', 0))],
        ['Unexpected', str(summary.get('unexpected', 0))],
    ]
    
    summary_table = Table(summary_data, colWidths=[3*inch, 3*inch])
    summary_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1e40af')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 11),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
        ('TOPPADDING', (0, 0), (-1, -1), 10),
        ('GRID', (0, 0), (-1, -1), 1, colors.grey),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f3f4f6')]),
    ]))
    
    elements.append(Paragraph("Summary Statistics", heading_style))
    elements.append(summary_table)
    elements.append(Spacer(1, 0.3*inch))
    
    # Missing Items
    missing_items = report_data.get('missing_items', [])
    if missing_items:
        elements.append(Paragraph("Missing Items", heading_style))
        missing_data = [['Item Name', 'RFID UID', 'Room', 'Floor']]
        for item in missing_items:
            missing_data.append([
                item.get('item_name', 'N/A'),
                item.get('rfid_uid', 'N/A'),
                item.get('room_name', 'N/A'),
                item.get('floor_title', 'N/A'),
            ])
        
        missing_table = Table(missing_data, colWidths=[2*inch, 2*inch, 1.5*inch, 1.5*inch])
        missing_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#dc2626')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
            ('TOPPADDING', (0, 0), (-1, -1), 6),
            ('GRID', (0, 0), (-1, -1), 1, colors.grey),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#fee2e2')]),
        ]))
        elements.append(missing_table)
        elements.append(Spacer(1, 0.3*inch))
    
    # Items In Service
    in_service_items = report_data.get('in_service_items', [])
    if in_service_items:
        elements.append(Paragraph("Items In Service", heading_style))
        service_data = [['Item Name', 'RFID UID', 'Room', 'Floor']]
        for item in in_service_items:
            service_data.append([
                item.get('item_name', 'N/A'),
                item.get('rfid_uid', 'N/A'),
                item.get('room_name', 'N/A'),
                item.get('floor_title', 'N/A'),
            ])
        
        service_table = Table(service_data, colWidths=[2*inch, 2*inch, 1.5*inch, 1.5*inch])
        service_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#f59e0b')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
            ('TOPPADDING', (0, 0), (-1, -1), 6),
            ('GRID', (0, 0), (-1, -1), 1, colors.grey),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#fef3c7')]),
        ]))
        elements.append(service_table)
        elements.append(Spacer(1, 0.3*inch))
    
    # Borrowed Items
    borrowed_items = report_data.get('borrowed_items', [])
    if borrowed_items:
        elements.append(Paragraph("Borrowed Items", heading_style))
        borrowed_data = [['Item Name', 'RFID UID', 'Room', 'Floor']]
        for item in borrowed_items:
            borrowed_data.append([
                item.get('item_name', 'N/A'),
                item.get('rfid_uid', 'N/A'),
                item.get('room_name', 'N/A'),
                item.get('floor_title', 'N/A'),
            ])
        
        borrowed_table = Table(borrowed_data, colWidths=[2*inch, 2*inch, 1.5*inch, 1.5*inch])
        borrowed_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#3b82f6')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
            ('TOPPADDING', (0, 0), (-1, -1), 6),
            ('GRID', (0, 0), (-1, -1), 1, colors.grey),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#dbeafe')]),
        ]))
        elements.append(borrowed_table)
        elements.append(Spacer(1, 0.3*inch))
    
    # Unexpected Items
    unexpected_items = report_data.get('unexpected_items', [])
    if unexpected_items:
        elements.append(Paragraph("Unexpected Items", heading_style))
        unexpected_data = [['RFID UID']]
        for item in unexpected_items:
            unexpected_data.append([item.get('rfid_uid', 'N/A')])
        
        unexpected_table = Table(unexpected_data, colWidths=[6*inch])
        unexpected_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#8b5cf6')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
            ('TOPPADDING', (0, 0), (-1, -1), 6),
            ('GRID', (0, 0), (-1, -1), 1, colors.grey),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#ede9fe')]),
        ]))
        elements.append(unexpected_table)
        elements.append(Spacer(1, 0.3*inch))
    
    # Footer
    elements.append(Spacer(1, 0.2*inch))
    footer_text = f"Report Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}"
    elements.append(Paragraph(footer_text, ParagraphStyle(
        'Footer',
        parent=normal_style,
        fontSize=8,
        textColor=colors.grey,
        alignment=TA_CENTER,
    )))
    
    # Build PDF
    doc.build(elements)
    buffer.seek(0)
    return buffer
