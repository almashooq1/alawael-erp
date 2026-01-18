# 📊 نظام التحليلات والرسوم البيانية المتقدمة

# Advanced Analytics and Visualization System

---

## 🎨 مكتبات التصور المستخدمة

```python
"""
مكتبات التصور البياني الاحترافية
"""

# Python Visualization Libraries
import matplotlib.pyplot as plt
import seaborn as sns
import plotly.graph_objects as go
import plotly.express as px
from plotly.subplots import make_subplots
import pandas as pd
import numpy as np
from scipy import stats
from sklearn.decomposition import PCA
from sklearn.cluster import KMeans
import warnings
warnings.filterwarnings('ignore')

# تكوين matplotlib للعربية
plt.rcParams['font.family'] = 'Arial'
plt.rcParams['axes.unicode_minus'] = False
```

---

## 📈 نظام الرسوم البيانية الشامل

### 1️⃣ رسوم بيانية تفاعلية (Plotly)

```python
class InteractiveCharts:
    """رسوم بيانية تفاعلية متقدمة"""

    def __init__(self, data):
        self.data = data
        self.colors = {
            'primary': '#667eea',
            'secondary': '#764ba2',
            'success': '#28a745',
            'warning': '#ffc107',
            'danger': '#dc3545',
            'info': '#17a2b8'
        }

    def create_progress_timeline(self, beneficiary_id):
        """رسم بياني خطي تفاعلي للتقدم عبر الزمن"""
        # جمع البيانات
        progress_data = self._get_progress_data(beneficiary_id)

        # إنشاء الرسم
        fig = go.Figure()

        domains = ['cognitive', 'motor', 'communication', 'social', 'adaptive']
        domain_names = {
            'cognitive': 'المعرفي',
            'motor': 'الحركي',
            'communication': 'التواصل',
            'social': 'الاجتماعي',
            'adaptive': 'التكيف'
        }

        for domain in domains:
            fig.add_trace(go.Scatter(
                x=progress_data['dates'],
                y=progress_data[domain],
                mode='lines+markers',
                name=domain_names[domain],
                line=dict(width=3),
                marker=dict(size=8),
                hovertemplate='<b>%{fullData.name}</b><br>' +
                             'التاريخ: %{x}<br>' +
                             'الدرجة: %{y}<br>' +
                             '<extra></extra>'
            ))

        # تخصيص التخطيط
        fig.update_layout(
            title={
                'text': 'التقدم عبر الزمن - جميع المجالات',
                'x': 0.5,
                'xanchor': 'center',
                'font': {'size': 20, 'color': '#1f4788'}
            },
            xaxis=dict(
                title='التاريخ',
                showgrid=True,
                gridcolor='rgba(0,0,0,0.1)'
            ),
            yaxis=dict(
                title='الدرجة',
                showgrid=True,
                gridcolor='rgba(0,0,0,0.1)',
                range=[0, 100]
            ),
            hovermode='x unified',
            plot_bgcolor='white',
            paper_bgcolor='white',
            font=dict(family='Arial', size=12),
            legend=dict(
                orientation='h',
                yanchor='bottom',
                y=1.02,
                xanchor='right',
                x=1
            ),
            height=500
        )

        return fig

    def create_domain_comparison_radar(self, beneficiary_id):
        """رسم بياني راداري لمقارنة المجالات"""
        # جمع البيانات
        current_scores = self._get_current_scores(beneficiary_id)
        baseline_scores = self._get_baseline_scores(beneficiary_id)
        target_scores = self._get_target_scores(beneficiary_id)

        categories = ['المعرفي', 'الحركي', 'التواصل', 'الاجتماعي', 'التكيف']

        fig = go.Figure()

        # الأساس
        fig.add_trace(go.Scatterpolar(
            r=baseline_scores,
            theta=categories,
            fill='toself',
            name='الأساس',
            line=dict(color='#dc3545', width=2),
            fillcolor='rgba(220, 53, 69, 0.2)'
        ))

        # الحالي
        fig.add_trace(go.Scatterpolar(
            r=current_scores,
            theta=categories,
            fill='toself',
            name='الحالي',
            line=dict(color='#28a745', width=2),
            fillcolor='rgba(40, 167, 69, 0.2)'
        ))

        # الهدف
        fig.add_trace(go.Scatterpolar(
            r=target_scores,
            theta=categories,
            fill='toself',
            name='الهدف',
            line=dict(color='#667eea', width=2, dash='dash'),
            fillcolor='rgba(102, 126, 234, 0.1)'
        ))

        fig.update_layout(
            polar=dict(
                radialaxis=dict(
                    visible=True,
                    range=[0, 100]
                )
            ),
            showlegend=True,
            title={
                'text': 'مقارنة الأداء - جميع المجالات',
                'x': 0.5,
                'xanchor': 'center',
                'font': {'size': 20, 'color': '#1f4788'}
            },
            height=600
        )

        return fig

    def create_assessment_heatmap(self, beneficiary_ids):
        """خريطة حرارية لنتائج التقييمات"""
        # جمع البيانات
        heatmap_data = self._prepare_heatmap_data(beneficiary_ids)

        fig = go.Figure(data=go.Heatmap(
            z=heatmap_data['values'],
            x=heatmap_data['assessments'],
            y=heatmap_data['beneficiaries'],
            colorscale=[
                [0, '#dc3545'],      # أحمر
                [0.5, '#ffc107'],    # أصفر
                [1, '#28a745']       # أخضر
            ],
            text=heatmap_data['values'],
            texttemplate='%{text}',
            textfont={"size": 12},
            hovertemplate='المستفيد: %{y}<br>' +
                         'التقييم: %{x}<br>' +
                         'الدرجة: %{z}<br>' +
                         '<extra></extra>'
        ))

        fig.update_layout(
            title={
                'text': 'خريطة حرارية - نتائج التقييمات',
                'x': 0.5,
                'xanchor': 'center',
                'font': {'size': 20, 'color': '#1f4788'}
            },
            xaxis=dict(title='التقييم', tickangle=-45),
            yaxis=dict(title='المستفيد'),
            height=600
        )

        return fig

    def create_3d_scatter(self, dataset):
        """رسم بياني ثلاثي الأبعاد"""
        fig = go.Figure(data=[go.Scatter3d(
            x=dataset['cognitive'],
            y=dataset['motor'],
            z=dataset['communication'],
            mode='markers',
            marker=dict(
                size=8,
                color=dataset['overall_score'],
                colorscale='Viridis',
                showscale=True,
                colorbar=dict(title='الدرجة الكلية'),
                opacity=0.8
            ),
            text=dataset['beneficiary_names'],
            hovertemplate='<b>%{text}</b><br>' +
                         'المعرفي: %{x}<br>' +
                         'الحركي: %{y}<br>' +
                         'التواصل: %{z}<br>' +
                         '<extra></extra>'
        )])

        fig.update_layout(
            title={
                'text': 'تحليل ثلاثي الأبعاد للأداء',
                'x': 0.5,
                'xanchor': 'center',
                'font': {'size': 20, 'color': '#1f4788'}
            },
            scene=dict(
                xaxis=dict(title='المعرفي'),
                yaxis=dict(title='الحركي'),
                zaxis=dict(title='التواصل')
            ),
            height=700
        )

        return fig

    def create_sankey_diagram(self, flow_data):
        """مخطط سانكي لتدفق المستفيدين"""
        fig = go.Figure(data=[go.Sankey(
            node=dict(
                pad=15,
                thickness=20,
                line=dict(color='black', width=0.5),
                label=flow_data['labels'],
                color=flow_data['colors']
            ),
            link=dict(
                source=flow_data['source'],
                target=flow_data['target'],
                value=flow_data['values']
            )
        )])

        fig.update_layout(
            title={
                'text': 'تدفق المستفيدين عبر البرامج',
                'x': 0.5,
                'xanchor': 'center',
                'font': {'size': 20, 'color': '#1f4788'}
            },
            height=600
        )

        return fig

    def create_waterfall_chart(self, changes_data):
        """مخطط شلال للتغيرات التراكمية"""
        fig = go.Figure(go.Waterfall(
            name='التقدم',
            orientation='v',
            measure=['relative'] * (len(changes_data['labels']) - 1) + ['total'],
            x=changes_data['labels'],
            textposition='outside',
            text=changes_data['text'],
            y=changes_data['values'],
            connector={'line': {'color': 'rgb(63, 63, 63)'}},
            increasing={'marker': {'color': '#28a745'}},
            decreasing={'marker': {'color': '#dc3545'}},
            totals={'marker': {'color': '#667eea'}}
        ))

        fig.update_layout(
            title={
                'text': 'التقدم التراكمي',
                'x': 0.5,
                'xanchor': 'center',
                'font': {'size': 20, 'color': '#1f4788'}
            },
            showlegend=True,
            height=500
        )

        return fig

    def create_funnel_chart(self, stages_data):
        """مخطط قمع لمراحل العلاج"""
        fig = go.Figure(go.Funnel(
            y=stages_data['stages'],
            x=stages_data['values'],
            textposition='inside',
            textinfo='value+percent initial',
            opacity=0.65,
            marker={
                'color': ['#667eea', '#764ba2', '#f093fb', '#f5576c', '#ffd89b'],
                'line': {'width': 2, 'color': 'white'}
            },
            connector={'line': {'color': '#667eea', 'width': 2}}
        ))

        fig.update_layout(
            title={
                'text': 'قمع مراحل العلاج',
                'x': 0.5,
                'xanchor': 'center',
                'font': {'size': 20, 'color': '#1f4788'}
            },
            height=500
        )

        return fig

    def create_sunburst_chart(self, hierarchy_data):
        """مخطط Sunburst للتسلسل الهرمي"""
        fig = go.Figure(go.Sunburst(
            labels=hierarchy_data['labels'],
            parents=hierarchy_data['parents'],
            values=hierarchy_data['values'],
            branchvalues='total',
            marker=dict(
                colorscale='RdYlGn',
                cmid=50
            ),
            hovertemplate='<b>%{label}</b><br>' +
                         'العدد: %{value}<br>' +
                         '<extra></extra>'
        ))

        fig.update_layout(
            title={
                'text': 'التوزيع الهرمي للمستفيدين',
                'x': 0.5,
                'xanchor': 'center',
                'font': {'size': 20, 'color': '#1f4788'}
            },
            height=600
        )

        return fig
```

---

### 2️⃣ لوحات معلومات تفاعلية (Dashboards)

```python
class InteractiveDashboard:
    """لوحة معلومات تفاعلية شاملة"""

    def create_executive_dashboard(self):
        """لوحة معلومات تنفيذية"""
        # إنشاء لوحة فرعية
        fig = make_subplots(
            rows=3, cols=3,
            subplot_titles=(
                'إجمالي المستفيدين', 'معدل الحضور', 'معدل التحسن',
                'التوزيع العمري', 'أنواع الإعاقة', 'البرامج النشطة',
                'التقدم الشهري', 'رضا العائلات', 'فعالية البرامج'
            ),
            specs=[
                [{'type': 'indicator'}, {'type': 'indicator'}, {'type': 'indicator'}],
                [{'type': 'bar'}, {'type': 'pie'}, {'type': 'bar'}],
                [{'type': 'scatter'}, {'type': 'bar'}, {'type': 'scatter'}]
            ],
            vertical_spacing=0.12,
            horizontal_spacing=0.1
        )

        # الصف الأول - المؤشرات
        fig.add_trace(
            go.Indicator(
                mode='number+delta',
                value=245,
                delta={'reference': 220, 'relative': True},
                title={'text': 'المستفيدون'},
                number={'suffix': ' مستفيد'},
                domain={'x': [0, 1], 'y': [0, 1]}
            ),
            row=1, col=1
        )

        fig.add_trace(
            go.Indicator(
                mode='gauge+number+delta',
                value=87,
                delta={'reference': 80},
                title={'text': 'معدل الحضور %'},
                gauge={
                    'axis': {'range': [None, 100]},
                    'bar': {'color': '#28a745'},
                    'steps': [
                        {'range': [0, 50], 'color': '#f8d7da'},
                        {'range': [50, 75], 'color': '#fff3cd'},
                        {'range': [75, 100], 'color': '#d4edda'}
                    ],
                    'threshold': {
                        'line': {'color': 'red', 'width': 4},
                        'thickness': 0.75,
                        'value': 85
                    }
                }
            ),
            row=1, col=2
        )

        fig.add_trace(
            go.Indicator(
                mode='number+delta',
                value=76,
                delta={'reference': 65, 'relative': True},
                title={'text': 'معدل التحسن %'},
                number={'suffix': '%'},
                domain={'x': [0, 1], 'y': [0, 1]}
            ),
            row=1, col=3
        )

        # الصف الثاني - الرسوم البيانية
        # التوزيع العمري
        age_groups = ['0-3', '4-6', '7-12', '13-18', '19+']
        age_counts = [45, 78, 85, 30, 7]

        fig.add_trace(
            go.Bar(
                x=age_groups,
                y=age_counts,
                marker_color='#667eea',
                text=age_counts,
                textposition='auto'
            ),
            row=2, col=1
        )

        # أنواع الإعاقة
        disability_types = ['جسدية', 'ذهنية', 'حسية', 'توحد', 'متعددة']
        disability_counts = [60, 85, 40, 45, 15]

        fig.add_trace(
            go.Pie(
                labels=disability_types,
                values=disability_counts,
                hole=0.4,
                marker=dict(colors=['#667eea', '#764ba2', '#f093fb', '#f5576c', '#ffd89b'])
            ),
            row=2, col=2
        )

        # البرامج النشطة
        programs = ['علاج طبيعي', 'نطق', 'وظيفي', 'نفسي', 'اجتماعي']
        program_counts = [120, 95, 80, 65, 55]

        fig.add_trace(
            go.Bar(
                x=programs,
                y=program_counts,
                marker_color='#28a745',
                text=program_counts,
                textposition='auto'
            ),
            row=2, col=3
        )

        # الصف الثالث - الاتجاهات
        months = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو']
        progress = [55, 62, 68, 72, 75, 78]

        fig.add_trace(
            go.Scatter(
                x=months,
                y=progress,
                mode='lines+markers',
                line=dict(color='#667eea', width=3),
                marker=dict(size=10)
            ),
            row=3, col=1
        )

        # رضا العائلات
        satisfaction_categories = ['ممتاز', 'جيد جداً', 'جيد', 'مقبول']
        satisfaction_counts = [120, 80, 35, 10]

        fig.add_trace(
            go.Bar(
                x=satisfaction_categories,
                y=satisfaction_counts,
                marker_color=['#28a745', '#17a2b8', '#ffc107', '#dc3545'],
                text=satisfaction_counts,
                textposition='auto'
            ),
            row=3, col=2
        )

        # فعالية البرامج
        efficacy_scores = [85, 78, 82, 75, 88]

        fig.add_trace(
            go.Scatter(
                x=programs,
                y=efficacy_scores,
                mode='lines+markers',
                line=dict(color='#764ba2', width=3),
                marker=dict(size=12),
                fill='tozeroy',
                fillcolor='rgba(118, 75, 162, 0.2)'
            ),
            row=3, col=3
        )

        # تحديث التخطيط
        fig.update_layout(
            title={
                'text': 'لوحة المعلومات التنفيذية',
                'x': 0.5,
                'xanchor': 'center',
                'font': {'size': 24, 'color': '#1f4788'}
            },
            showlegend=False,
            height=1200,
            plot_bgcolor='white',
            paper_bgcolor='white'
        )

        return fig

    def create_clinical_dashboard(self, beneficiary_id):
        """لوحة معلومات سريرية"""
        fig = make_subplots(
            rows=2, cols=2,
            subplot_titles=(
                'التقدم عبر الزمن',
                'مقارنة المجالات',
                'معدل تحقيق الأهداف',
                'توزيع الجلسات'
            ),
            specs=[
                [{'type': 'scatter'}, {'type': 'bar'}],
                [{'type': 'indicator'}, {'type': 'pie'}]
            ]
        )

        # البيانات
        dates = pd.date_range('2025-07-01', '2026-01-14', freq='W')
        scores = np.random.randint(50, 90, size=len(dates))

        # التقدم عبر الزمن
        fig.add_trace(
            go.Scatter(
                x=dates,
                y=scores,
                mode='lines+markers',
                line=dict(color='#667eea', width=3),
                marker=dict(size=8)
            ),
            row=1, col=1
        )

        # مقارنة المجالات
        domains = ['المعرفي', 'الحركي', 'التواصل', 'الاجتماعي', 'التكيف']
        domain_scores = [75, 82, 68, 70, 78]

        fig.add_trace(
            go.Bar(
                x=domains,
                y=domain_scores,
                marker_color='#28a745',
                text=domain_scores,
                textposition='auto'
            ),
            row=1, col=2
        )

        # معدل تحقيق الأهداف
        fig.add_trace(
            go.Indicator(
                mode='gauge+number',
                value=78,
                title={'text': 'تحقيق الأهداف %'},
                gauge={
                    'axis': {'range': [None, 100]},
                    'bar': {'color': '#667eea'},
                    'steps': [
                        {'range': [0, 50], 'color': 'lightgray'},
                        {'range': [50, 75], 'color': '#fff3cd'},
                        {'range': [75, 100], 'color': '#d4edda'}
                    ]
                }
            ),
            row=2, col=1
        )

        # توزيع الجلسات
        session_types = ['علاج طبيعي', 'نطق', 'وظيفي', 'نفسي']
        session_counts = [24, 18, 16, 12]

        fig.add_trace(
            go.Pie(
                labels=session_types,
                values=session_counts,
                hole=0.4
            ),
            row=2, col=2
        )

        fig.update_layout(
            title={
                'text': 'لوحة المعلومات السريرية',
                'x': 0.5,
                'xanchor': 'center',
                'font': {'size': 24, 'color': '#1f4788'}
            },
            height=800,
            showlegend=False
        )

        return fig
```

---

### 3️⃣ تحليلات إحصائية متقدمة

```python
class AdvancedStatisticalAnalytics:
    """تحليلات إحصائية متقدمة"""

    def perform_regression_analysis(self, data):
        """تحليل انحدار متعدد"""
        from sklearn.linear_model import LinearRegression
        from sklearn.metrics import r2_score, mean_squared_error

        X = data[['age', 'disability_severity', 'session_frequency']]
        y = data['improvement_score']

        model = LinearRegression()
        model.fit(X, y)

        y_pred = model.predict(X)
        r2 = r2_score(y, y_pred)
        rmse = np.sqrt(mean_squared_error(y, y_pred))

        # رسم بياني للنتائج
        fig = make_subplots(
            rows=1, cols=2,
            subplot_titles=('القيم الفعلية مقابل المتوقعة', 'أهمية المتغيرات')
        )

        fig.add_trace(
            go.Scatter(
                x=y,
                y=y_pred,
                mode='markers',
                marker=dict(size=8, color='#667eea'),
                name='البيانات'
            ),
            row=1, col=1
        )

        # خط الانحدار المثالي
        perfect_line = np.linspace(y.min(), y.max(), 100)
        fig.add_trace(
            go.Scatter(
                x=perfect_line,
                y=perfect_line,
                mode='lines',
                line=dict(color='red', dash='dash'),
                name='المثالي'
            ),
            row=1, col=1
        )

        # أهمية المتغيرات
        feature_importance = np.abs(model.coef_)
        features = ['العمر', 'شدة الإعاقة', 'تكرار الجلسات']

        fig.add_trace(
            go.Bar(
                x=features,
                y=feature_importance,
                marker_color='#28a745'
            ),
            row=1, col=2
        )

        fig.update_layout(
            title=f'تحليل الانحدار (R² = {r2:.3f}, RMSE = {rmse:.3f})',
            height=500
        )

        return fig, {'r2': r2, 'rmse': rmse, 'coefficients': model.coef_}

    def perform_clustering_analysis(self, data):
        """تحليل العنقود (Clustering)"""
        from sklearn.preprocessing import StandardScaler

        # تطبيع البيانات
        scaler = StandardScaler()
        scaled_data = scaler.fit_transform(data)

        # K-Means
        kmeans = KMeans(n_clusters=3, random_state=42)
        clusters = kmeans.fit_predict(scaled_data)

        # PCA للتصور
        pca = PCA(n_components=2)
        pca_data = pca.fit_transform(scaled_data)

        # رسم بياني
        fig = go.Figure()

        for cluster_id in range(3):
            cluster_mask = clusters == cluster_id
            fig.add_trace(go.Scatter(
                x=pca_data[cluster_mask, 0],
                y=pca_data[cluster_mask, 1],
                mode='markers',
                name=f'المجموعة {cluster_id + 1}',
                marker=dict(size=10)
            ))

        # المراكز
        centers_pca = pca.transform(kmeans.cluster_centers_)
        fig.add_trace(go.Scatter(
            x=centers_pca[:, 0],
            y=centers_pca[:, 1],
            mode='markers',
            name='المراكز',
            marker=dict(
                size=20,
                color='black',
                symbol='x'
            )
        ))

        fig.update_layout(
            title='تحليل العنقود - PCA',
            xaxis_title='المكون الأول',
            yaxis_title='المكون الثاني',
            height=600
        )

        return fig, clusters

    def perform_survival_analysis(self, data):
        """تحليل البقاء (Survival Analysis)"""
        from lifelines import KaplanMeierFitter

        kmf = KaplanMeierFitter()
        kmf.fit(data['duration'], event_observed=data['event'])

        # رسم بياني
        fig = go.Figure()

        survival_func = kmf.survival_function_
        fig.add_trace(go.Scatter(
            x=survival_func.index,
            y=survival_func['KM_estimate'],
            mode='lines',
            line=dict(color='#667eea', width=3),
            fill='tozeroy',
            fillcolor='rgba(102, 126, 234, 0.3)',
            name='منحنى البقاء'
        ))

        # فترات الثقة
        confidence_interval = kmf.confidence_interval_
        fig.add_trace(go.Scatter(
            x=confidence_interval.index,
            y=confidence_interval['KM_estimate_upper_0.95'],
            mode='lines',
            line=dict(color='#667eea', width=1, dash='dash'),
            showlegend=False
        ))

        fig.add_trace(go.Scatter(
            x=confidence_interval.index,
            y=confidence_interval['KM_estimate_lower_0.95'],
            mode='lines',
            line=dict(color='#667eea', width=1, dash='dash'),
            fill='tonexty',
            fillcolor='rgba(102, 126, 234, 0.1)',
            showlegend=False
        ))

        fig.update_layout(
            title='منحنى كابلان-ماير للبقاء',
            xaxis_title='الوقت (أيام)',
            yaxis_title='احتمالية البقاء',
            height=500
        )

        return fig
```

---

**آخر تحديث:** 14 يناير 2026  
**الحالة:** ✅ نظام تحليلات ورسوم بيانية متقدم
