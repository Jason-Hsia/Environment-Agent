"""Download public official standards and produce page-aware retrieval data.
Run with Python and pypdf installed. No model/API key is required.
"""
import hashlib, json, re, urllib.request
from pathlib import Path
from pypdf import PdfReader

ROOT = Path(__file__).resolve().parents[1]
CATALOG = [
 dict(id='zj-urban', code='DB33/2169-2018', title='城镇污水处理厂主要水污染物排放标准', region='浙江省', topic='城镇污水', published='2018-12-17', effective='2019-01-01', end=None, kind='地方标准', source='https://sthjt.zj.gov.cn/art/2018/12/20/art_1201911_28665684.html', statusSource='https://std.samr.gov.cn/db/search/stdDBDetailed?id=998D2858B40198C7E05397BE0A0A95D8', note='国家标准、环评批复与排污许可证需结合核对。', url=None),
 dict(id='zj-rural', code='DB33/973-2021', title='农村生活污水集中处理设施水污染物排放标准', region='浙江省', topic='农村污水', published='2021-09-09', effective='2022-01-01', end=None, kind='地方标准', source='https://sthjt.zj.gov.cn/module/download/downfile.jsp?classid=-1&filename=2201271237082943127.pdf', note='代替 DB33/973-2015；按设施规模和排放去向核对适用等级。', url='https://sthjt.zj.gov.cn/module/download/downfile.jsp?classid=-1&filename=2201271237082943127.pdf'),
 dict(id='gb-urban', code='GB 18918-2002 · 含2025年修改单', title='城镇污水处理厂污染物排放标准', region='全国', topic='城镇污水', published='2002-12-24', effective='2026-03-01', end=None, kind='国家标准', source='https://www.mee.gov.cn/ywgz/fgbz/bz/bzwb/shjbh/swrwpfbz/200307/t20030701_66529.shtml', note='此记录为含2025年修改单的合并文本；2026-03-01前不适用此版本。', url='https://www.mee.gov.cn/ywgz/fgbz/bz/bzwb/shjbh/swrwpfbz/200307/W020260206765128897192.pdf'),
 dict(id='gb-amendment', code='公告 2025年第24号', title='GB 18918-2002 修改单发布公告', region='全国', topic='城镇污水', published='2025-11-04', effective='2026-03-01', end=None, kind='修改公告', source='https://www.mee.gov.cn/xxgk2018/xxgk/xxgk01/202512/t20251209_1137361.html', note='修改单自2026年3月1日实施，原标准未因修改单整体废止。', url=None),
 dict(id='hj-monitor', code='HJ 91.1-2019', title='污水监测技术规范', region='全国', topic='监测管理', published='2019-12-24', effective='2020-03-24', end=None, kind='技术规范', source='https://www.mee.gov.cn/ywgz/fgbz/bz/bzwb/jcffbz/201912/t20191227_751689.shtml', note='部分代替 HJ/T 91-2002，不能将旧规范整体标记废止。', url='https://www.mee.gov.cn/ywgz/fgbz/bz/bzwb/jcffbz/201912/W020191227499037308984.pdf'),
 dict(id='hj-self', code='HJ 1083-2020', title='排污单位自行监测技术指南 水处理', region='全国', topic='监测管理', published='2020-01-06', effective='2020-04-01', end=None, kind='技术指南', source='https://www.mee.gov.cn/ywgz/fgbz/bz/bzwb/jcffbz/202001/t20200113_758891.shtml', note='使用前核对适用范围、处理规模及对应监测表格。', url='https://www.mee.gov.cn/ywgz/fgbz/bz/bzwb/jcffbz/202001/W020200113382867127256.pdf'),
 dict(id='zj-rural-old', code='DB33/973-2015', title='农村生活污水处理设施水污染物排放标准', region='浙江省', topic='农村污水', published=None, effective=None, end='2022-01-01', kind='历史标准', source='https://www.mee.gov.cn/ywgz/fgbz/bz/dfhjbhbzba/202512/t20251212_1137679.shtml', note='由 DB33/973-2021 代替。仅收录替代关系，旧版全文尚未入库。', url=None),
 dict(id='hj-soil', code='HJ 166-2026', title='土壤环境监测技术规范', region='全国', topic='土壤采样', published='2026-02-09', effective='2026-06-01', end=None, kind='技术规范', source='https://www.mee.gov.cn/ywgz/fgbz/bz/bzwb/jcffbz/202602/t20260228_1145106.shtml', note='代替 HJ/T 166-2004，覆盖方案、布点、采集、制备、流转、保存和质量控制。', url='https://www.mee.gov.cn/ywgz/fgbz/bz/bzwb/jcffbz/202602/W020260228616659533678.pdf'),
 dict(id='hj-soil-old', code='HJ/T 166-2004', title='土壤环境监测技术规范', region='全国', topic='土壤采样', published='2004-12-09', effective='2004-12-09', end='2026-06-01', kind='历史标准', source='https://www.mee.gov.cn/ywgz/fgbz/bz/bzwb/jcffbz/200412/t20041209_63367.shtml', note='自2026年6月1日起由 HJ 166-2026 代替；仅保留版本关系，不进入当前默认检索。', url=None),
 dict(id='hj-soil-voc', code='HJ 1019-2019', title='地块土壤和地下水中挥发性有机物采样技术导则', region='全国', topic='土壤采样', published='2019-05-12', effective='2019-09-01', end=None, kind='技术导则', source='https://www.mee.gov.cn/ywgz/fgbz/bz/bzwb/jcffbz/201905/t20190513_702683.shtml', note='适用于地块土壤和地下水中挥发性有机物采样，规定采样计划、现场采集、保存运输和质量控制等要求。', url='https://www.mee.gov.cn/ywgz/fgbz/bz/bzwb/jcffbz/201905/W020190516584161547667.pdf'),
 dict(id='hj-water-preserve', code='HJ 493-2009', title='水质 样品的保存和管理技术规定', region='全国', topic='水样采集', published='2009-09-27', effective='2009-11-01', end=None, kind='技术规定', source='https://www.mee.gov.cn/ywgz/fgbz/bz/bzwb/jcffbz/200910/t20091010_162157.htm', note='适用于天然水、生活污水和工业废水等样品的容器、保护剂、标签、运输与接收管理。', url='https://www.mee.gov.cn/ywgz/fgbz/bz/bzwb/jcffbz/200910/W020111114540735543139.pdf'),
 dict(id='hj-water-guide', code='HJ 494-2009', title='水质 采样技术指导', region='全国', topic='水样采集', published='2009-09-27', effective='2009-11-01', end=None, kind='技术指导', source='https://www.mee.gov.cn/ywgz/fgbz/bz/bzwb/jcffbz/200910/t20091010_162158.shtml', note='规定不同水体、水样类型和采样设备的基本原则，不替代具体监测场景的详细步骤。', url='https://www.mee.gov.cn/ywgz/fgbz/bz/bzwb/jcffbz/200910/W020111114543133505806.pdf'),
 dict(id='hj-water-plan', code='HJ 495-2009', title='水质 采样方案设计技术规定', region='全国', topic='水样采集', published='2009-09-27', effective='2009-11-01', end=None, kind='技术规定', source='https://www.mee.gov.cn/ywgz/fgbz/bz/bzwb/jcffbz/200910/t20091010_162163.htm', note='用于确定采样目标、地点、时机、频率、持续时间、样品处理和分析要求。', url='https://www.mee.gov.cn/ywgz/fgbz/bz/bzwb/jcffbz/200910/W020111114546111889133.pdf'),
 dict(id='hj-surface-water', code='HJ 91.2-2022', title='地表水环境质量监测技术规范', region='全国', topic='水样采集', published='2022-04-15', effective='2022-08-01', end=None, kind='技术规范', source='https://www.mee.gov.cn/ywgz/fgbz/bz/bzwb/jcffbz/202205/t20220506_977066.shtml', note='部分代替 HJ/T 91-2002 的地表水环境质量监测技术部分。', url='https://www.mee.gov.cn/ywgz/fgbz/bz/bzwb/jcffbz/202205/W020220506653788208550.pdf'),
 dict(id='hj-ground-water', code='HJ 164-2020', title='地下水环境监测技术规范', region='全国', topic='水样采集', published='2020-12-01', effective='2021-03-01', end=None, kind='技术规范', source='https://www.mee.gov.cn/ywgz/fgbz/bz/bzwb/jcffbz/202012/t20201203_811333.shtml', note='代替 HJ/T 164-2004，覆盖监测点、监测井、样品采集保存和质量控制。', url='https://www.mee.gov.cn/ywgz/fgbz/bz/bzwb/jcffbz/202012/W020201203608473632069.pdf'),
 dict(id='js-urban', code='DB32/4440-2022', title='城镇污水处理厂污染物排放标准', region='江苏省', topic='城镇污水', published='2022-12-28', effective='2023-03-28', end=None, kind='地方标准', source='https://sthjt.jiangsu.gov.cn/art/2023/2/1/art_83739_10738875.html', note='分区、分规模规定城镇污水处理厂水和大气污染物要求；现有设施过渡期与项目许可证需结合核对。', url='https://sthjj.nanjing.gov.cn/hbyw/jckj/202307/P020230727378732731919.pdf'),
 dict(id='js-rural', code='DB32/3462-2020', title='农村生活污水处理设施水污染物排放标准', region='江苏省', topic='农村污水', published='2020-05-13', effective='2020-11-13', end=None, kind='地方标准', source='https://sthjt.jiangsu.gov.cn/module/download/downfile.jsp?classid=0&filename=d887f641a3374565891e2a5db8859450.pdf', note='代替 DB32/T 3462-2018，适用于设计日处理能力小于500立方米的农村生活污水处理设施。', url='https://sthjt.jiangsu.gov.cn/module/download/downfile.jsp?classid=0&filename=d887f641a3374565891e2a5db8859450.pdf'),
 dict(id='sh-comprehensive', code='DB31/199-2018', title='污水综合排放标准', region='上海市', topic='企业纳管', published='2018-11-22', effective='2018-12-01', end=None, kind='地方标准', source='https://sthj.sh.gov.cn/hbzhywpt1024/hbzhywpt1038/20181205/0024-114279.html', note='适用于标准范围内排污单位的直接和间接排放；行业标准、环评批复和排污许可证要求需同时核对。', url='https://sthj.sh.gov.cn/assets/html/114279.pdf'),
 dict(id='sh-rural-guide', code='DB31 SW/Z 012-2026', title='上海市农村生活污水治理技术指南', region='上海市', topic='农村污水', published='2026-01-26', effective='2026-02-01', end=None, kind='技术指南', source='https://www.shanghai.gov.cn/gwk/search/content/c3c987407c364f7394e934892704728d', note='代替2021版治理指南；本文件提供规划、设计、施工、验收和运维技术要求，不是污染物排放限值标准。', url='https://www.shanghai.gov.cn/cmsres/18/18edb06365f04c69b862a305a6ddf345/1b3adeb32045169358a230394cb99114.pdf'),
 dict(id='sh-rural-old', code='DB31/T 1163-2019', title='农村生活污水处理设施水污染物排放标准', region='上海市', topic='农村污水', published='2019-06-14', effective='2019-07-01', end='2025-07-18', kind='历史标准', source='https://www.shanghai.gov.cn/gwk/search/content/2c984a72982c6603019835210aff23ec', statusSource='https://std.samr.gov.cn/db/search/stdDBDetailed?id=998D10AF3AA59114E05397BE0A0AD9B3', note='已于2025年7月18日废止；仅保留版本关系，不进入当前默认检索。新的强制性排放标准尚未在本次核验中确认发布。', url=None),
 dict(id='bj-urban', code='DB11/890-2012', title='城镇污水处理厂水污染物排放标准', region='北京市', topic='城镇污水', published='2012-05-28', effective='2012-07-01', end=None, kind='地方标准', source='https://sthjj.beijing.gov.cn/bjhrb/index/ztzl/436400273/436400631/9180bb59-8.html', note='按新建或现有设施、受纳水体类别等条件确定限值，需结合排污许可证核对。', url='https://sthjj.beijing.gov.cn/bjhrb/resource/cms/article/bjhrb_810268/502337/2019122315153572044.pdf'),
 dict(id='bj-comprehensive', code='DB11/307-2013', title='水污染物综合排放标准', region='北京市', topic='企业纳管', published='2013-12-20', effective='2014-01-01', end=None, kind='地方标准', source='https://sthjj.beijing.gov.cn/bjhrb/index/ztzl/436400273/436400631/9180bb59-8.html', note='适用于除城镇污水处理厂、医疗机构及后续专项地方标准范围外的污染源，需先判断直接或间接排放。', url='https://sthjj.beijing.gov.cn/bjhrb/resource/cms/article/679767/1712973/2023062714245135848.pdf'),
 dict(id='bj-rural', code='DB11/1612-2019', title='农村生活污水处理设施水污染物排放标准', region='北京市', topic='农村污水', published='2019-01-07', effective='2019-01-10', end=None, kind='地方标准', source='https://sthjj.beijing.gov.cn/bjhrb/index/xxgk69/sthjlyzwg/wrygl/844928/index.html', note='按设施规模、受纳水体类别和重点区域等条件确定排放要求。', url='https://sthjj.beijing.gov.cn/bjhrb/resource/cms/2019/01/2019011817540190275.pdf'),
 dict(id='bj-soil-investigation', code='DB11/T 656-2019', title='建设用地土壤污染状况调查与风险评估技术导则', region='北京市', topic='土壤采样', published='2019-09-26', effective='2019-10-01', end=None, kind='地方标准', source='https://sthjj.beijing.gov.cn/bjhrb/index/xxgk69/sthjlyzwg/wrygl/856066/index.html', note='适用于北京市建设用地土壤、地下水污染状况调查与风险评估，包含布点密度、垂向采样间距及土壤气调查要求。', url='https://sthjj.beijing.gov.cn/bjhrb/resource/cms/article/679767/1713006/2022040816270576203.pdf'),
 dict(id='hj-air-manual', code='HJ 194-2017', title='环境空气质量手工监测技术规范', region='全国', topic='气体采样', published='2017-12-29', effective='2018-04-01', end=None, kind='技术规范', source='https://www.mee.gov.cn/ywgz/fgbz/bz/bzwb/jcffbz/201801/t20180108_429319.shtml', note='覆盖环境空气手工监测点位、频次、采集、运输、保存和质量控制；浓度状态与体积计算需结合2018年修改单。', url='https://www.mee.gov.cn/ywgz/fgbz/bz/bzwb/jcffbz/201801/W020180108573132220085.pdf'),
 dict(id='hj-air-manual-amendment', code='HJ 194-2017 修改单', title='环境空气质量手工监测技术规范修改单', region='全国', topic='气体采样', published='2018-08-13', effective='2018-09-01', end=None, kind='修改单', source='https://www.mee.gov.cn/xxgk2018/xxgk/xxgk01/201808/t20180815_629605.html', note='修改标准状态、参比状态及采样体积计算要求，应与HJ 194-2017正文配套使用。', url='https://www.mee.gov.cn/xxgk2018/xxgk/xxgk01/201808/W020180926382670932054.pdf'),
 dict(id='bj-stack-voc', code='DB11/T 1484-2017', title='固定污染源废气挥发性有机物监测技术规范', region='北京市', topic='气体采样', published='2017-12-15', effective='2018-03-01', end=None, kind='地方标准', source='https://sthjj.beijing.gov.cn/bjhrb/index/xxgk69/zfxxgk43/fdzdgknr2/zcfb/dfbz87/a66f7ba2-6.html', note='适用于北京市固定污染源有组织和无组织排放中挥发性有机物的手工监测，包括点位、采样、分析与质量保证要求。', url='https://sthjj.beijing.gov.cn/bjhrb/resource/cms/2017/12/2017122813285492017.pdf'),
 dict(id='yrd-stack-monitor', code='DB31/T 310003-2021 / DB32/T 310003-2021 / DB33/T 310003-2021', codes=['DB31/T 310003-2021','DB32/T 310003-2021','DB33/T 310003-2021'], title='长三角生态绿色一体化发展示范区固定污染源废气现场监测技术规范', region='上海市、江苏省、浙江省', regions=['上海市','江苏省','浙江省'], topic='气体采样', published='2021-03-19', effective='2021-06-01', end=None, kind='区域协同标准', source='https://zjjcmspublic.oss-cn-hangzhou-zwynet-d01-a.internet.cloud.zj.gov.cn/jcms_files/jcms1/web1756/site/attach/0/6442d2498f904458b6a4c370e19c823e.pdf', statusSource='https://std.samr.gov.cn/db/search/stdDBDetailed?id=C362B3DB6268A067E05397BE0A0A1ED8', note='三地联合标准，直接适用于长三角生态绿色一体化发展示范区（上海青浦、江苏吴江、浙江嘉善）；其他区域仅可参照使用。', url='https://zjjcmspublic.oss-cn-hangzhou-zwynet-d01-a.internet.cloud.zj.gov.cn/jcms_files/jcms1/web1756/site/attach/0/6442d2498f904458b6a4c370e19c823e.pdf'),
 dict(id='hj-stack-monitor', code='HJ/T 397-2007', title='固定源废气监测技术规范', region='全国', topic='气体采样', published='2007-12-07', effective='2008-03-01', end=None, kind='技术规范', source='https://www.mee.gov.cn/ywgz/fgbz/bz/bzwb/jcffbz/200712/t20071213_114278.htm', note='覆盖固定源废气监测准备、排放参数、颗粒物与气态污染物采样测定及质量保证；2027年起点位设置相关条款按HJ 1405执行。', url='https://www.mee.gov.cn/ywgz/fgbz/bz/bzwb/jcffbz/200712/W020120106360054174772.pdf'),
 dict(id='gb-stack-sampling', code='GB/T 16157-1996 · 含修改单', title='固定污染源排气中颗粒物测定与气态污染物采样方法', region='全国', topic='气体采样', published='1996-03-06', effective='1996-03-06', end=None, kind='国家标准', source='https://www.mee.gov.cn/ywgz/fgbz/bz/bzwb/jcffbz/199603/t19960306_67508.shtml', statusSource='https://www.mee.gov.cn/ywgz/fgbz/bz/bzwb/jcffbz/201801/t20180108_429329.shtml', note='用于固定污染源有组织排放颗粒物测定和气态污染物采样；已关联2017年修改单，2027年起部分点位条款按HJ 1405执行。', url='https://www.mee.gov.cn/ywgz/fgbz/bz/bzwb/jcffbz/199603/W020230508363566846163.pdf'),
 dict(id='hj-air-voc', code='HJ 759-2023', title='环境空气 65种挥发性有机物的测定 罐采样/气相色谱-质谱法', region='全国', topic='气体采样', published='2023-02-09', effective='2023-08-01', end=None, kind='监测方法', source='https://www.mee.gov.cn/ywgz/fgbz/bz/bzwb/jcffbz/202303/t20230314_1019446.shtml', note='代替HJ 759-2015，适用于环境空气和无组织排放监控点空气中65种挥发性有机物的罐采样与测定。', url='https://www.mee.gov.cn/ywgz/fgbz/bz/bzwb/jcffbz/202303/W020230314363574522182.pdf'),
 dict(id='hj-stack-voc', code='HJ 732-2025', title='固定污染源废气 挥发性有机物的采样 气袋法', region='全国', topic='气体采样', published='2025-09-12', effective='2026-04-01', end=None, kind='采样方法', source='https://www.mee.gov.cn/ywgz/fgbz/bz/bzwb/jcffbz/202509/t20250912_1127322.shtml', note='代替HJ 732-2014，适用于固定污染源有组织排放废气中挥发性有机物的气袋采样。', url='https://www.mee.gov.cn/ywgz/fgbz/bz/bzwb/jcffbz/202509/W020250912551694311763.pdf'),
 dict(id='hj-stack-voc-old', code='HJ 732-2014', title='固定污染源废气 挥发性有机物的采样 气袋法', region='全国', topic='气体采样', published='2014-12-31', effective='2015-02-01', end='2026-04-01', kind='历史标准', source='https://www.mee.gov.cn/ywgz/fgbz/bz/bzwb/jcffbz/202509/t20250912_1127322.shtml', note='自2026年4月1日起由HJ 732-2025代替；仅保留版本关系，不进入当前默认检索。', url=None),
 dict(id='hj-outlet-site', code='HJ 1405-2024', title='排污单位污染物排放口监测点位设置技术规范', region='全国', topic='气体采样', published='2024-12-25', effective='2027-01-01', end=None, kind='技术规范', source='https://www.mee.gov.cn/ywgz/fgbz/bz/bzwb/jcffbz/202501/t20250126_1101549.shtml', note='2027年1月1日起实施，统一固定污染源废气及污水排放口的监测断面、监测孔、平台、梯架、标志牌和点位管理要求。', url='https://www.mee.gov.cn/ywgz/fgbz/bz/bzwb/jcffbz/202501/W020250126593804577890.pdf'),
]

# The official DB32/4440 PDF has no usable Unicode map. These page texts were
# transcribed from the rendered official PDF so retrieval never indexes glyph codes.
MANUAL_PAGES = {
 ('js-urban',4): '''城镇污水处理厂污染物排放标准。1 范围：本文件规定了城镇污水处理厂污染物的控制要求、监测要求、达标判定以及实施与监督。本文件适用于城镇污水处理厂污染物的排放管理，以及城镇污水处理厂建设项目的环境影响评价、环境保护设施设计、竣工环境保护验收、排污许可证核发及其投产后的污染物排放管理。''',
 ('js-urban',6): '''3 术语和定义。3.1 城镇污水：城镇居民生活污水，机关、学校、医院、商业服务机构及各种公共设施排水，以及允许排入城镇污水收集系统的工业废水和初期雨水等。3.2 城镇污水处理厂：对进入城镇污水收集系统的污水进行净化处理的污水处理厂。3.3 现有城镇污水处理厂：本文件实施之日前已建成投产或环境影响评价文件已通过审批的城镇污水处理厂，及对其改建或原址扩建。3.4 新建城镇污水处理厂：本文件实施之日起环境影响评价文件通过审批的新建、异址扩建城镇污水处理厂。''',
 ('js-urban',7): '''4 污染物控制要求。4.1.1 控制项目分为基本控制项目和特征控制项目；基本控制项目必须执行，特征控制项目由地方生态环境主管部门根据接纳工业污染物类别和水环境质量要求选择。4.1.2 区域分为重点保护区域和一般区域。4.1.3 基本控制项目的12项常规污染物分A、B、C、D标准。新建厂：重点保护区域且总设计规模不小于5000 m3/d，或一般区域且总设计规模不小于10000 m3/d，执行A标准；其他执行B标准。现有厂：重点保护区域执行B标准；一般区域中太湖地区执行C标准，其他一般区域总设计规模不小于3000 m3/d执行C标准，小于3000 m3/d执行D标准。表1日均排放限值：COD A/B/C/D为30/40/50/50 mg/L；氨氮1.5(3)/3(5)/4(6)/5(8) mg/L；总氮10(12)/10(12)/12(15)/15 mg/L；总磷0.3/0.3/0.5/0.5 mg/L；悬浮物10 mg/L；BOD5 10 mg/L；动植物油1 mg/L；石油类1 mg/L；阴离子表面活性剂0.5 mg/L；色度30倍；pH 6—9；粪大肠菌群数1000 MPN/L或CFU/L。括号内限值在每年11月1日至次年3月31日执行。''',
 ('js-urban',8): '''表2 四项主要常规污染物一次监测排放限值：COD A/B/C/D为50/60/75/75 mg/L；氨氮3(6)/6(10)/8(12)/10(15) mg/L；总氮12(15)/12(15)/15(20)/20 mg/L；总磷0.5/0.5/1/1 mg/L。括号内限值在每年11月1日至次年3月31日执行。4.1.3.4 基本控制项目中7项一类污染物执行表3日均限值：总汞0.001 mg/L、烷基汞不应检出、总镉0.01 mg/L、总铬0.1 mg/L、六价铬0.05 mg/L、总砷0.1 mg/L、总铅0.1 mg/L。4.1.3.5 特征控制项目包括45项污染物，排放限值执行表4。''',
 ('js-urban',9): '''4.1.3.6 排入城镇污水处理厂的工业废水和医院污水，应达到国家和江苏省相关要求。4.2 大气污染物：有组织大气污染物排放限值执行表5；厂界大气污染物浓度限值分一级和二级，厂址位于GB 3095一类区执行一级标准，位于二类区执行二级标准。''',
 ('js-urban',10): '''4.2.5 在符合安全生产、职业卫生规定前提下，实施废气密闭收集的车间或构筑物门窗、检查口应关闭。4.2.6 新建城镇污水处理厂周围应建设绿化带并设置大气环境防护距离和卫生防护距离。4.3 污泥和噪声分别按GB 18918和GB 12348执行。5 污染物监测要求：监测点位应按HJ 91.1、HJ 978、HJ 1083设置并设置永久性排污口标志；监测频次按HJ 1083执行；测定日均浓度至少每2 h取样一次，取24 h混合样，不能测定混合样的项目在24 h内每次取样分析并计算算术平均值；一次监测按HJ 91.1采集满足一次测试所需样品；采样位置、方法和保存按HJ 91.1、HJ 493、HJ 494、HJ 495执行；自动监测设备按排污许可证规定执行并保存原始记录。''',
 ('js-urban',11): '''6 达标判定：表1和表2涉及的污染物控制项目，日均排放值超过表1或一次监测排放值超过表2，均为超标；表3和表4项目日均排放值超过限值为超标。大气污染物采用手工监测时最大值超过限值为超标；自动监测时任意1 h平均值超过限值为超标。7.1 执行时间：新建城镇污水处理厂自本文件实施之日起执行；现有城镇污水处理厂自本文件实施之日起3年后执行。国家或江苏省发布更严格要求时执行相关标准。''',
 ('gb-stack-sampling',4): '''固定污染源排气中颗粒物测定与气态污染物采样方法。1 主题内容和适用范围：规定烟道、烟囱及排气筒等固定污染源排气中颗粒物的测定方法和气态污染物的采样方法，适用于各种锅炉、工业炉窑及其他固定污染源。3 测定与计算包括排气参数、排气密度和气体分子量、排气流速和流量、颗粒物排放浓度和排放率、气态污染物采样及排放浓度和排放率。4 采样应在生产设备正常运行或排放标准规定的工况条件下进行。采样位置应优先选择垂直管段，避开烟道弯头和断面急剧变化部位。''',
 ('gb-stack-sampling',5): '''4.2.1.2 对气态污染物，因混合比较均匀，采样位置可不受颗粒物采样位置限制，但应避开涡流区；同时测定排气流量时，按颗粒物采样位置选取。4.2.1.3 采样位置应避开对测试人员有危险的场所。4.2.2 在选定测定位置开设采样孔：采样孔内径一般不小于80 mm，采样孔管长不大于50 mm；仅采集气态污染物时，内径应不小于40 mm。正压下输送高温或有毒气体的烟道应采用带闸板阀的密封采样孔。''',
 ('gb-stack-sampling',6): '''4.2.3 采样平台应有足够工作面积保障安全和操作，平台面积不小于1.5 m2，并设置1.1 m高护栏，采样孔距平台面约1.2～1.3 m。圆形烟道采样孔应设在包括各测定点在内的互相垂直直径线上；矩形或方形烟道采样孔应设在包括各测定点在内的延长线上。''',
 ('gb-stack-sampling',26): '''9 气态污染物采样方法。9.1 采样位置原则上应符合4.2.1，气态污染物在采样断面内一般混合较均匀，可取靠近烟道中心的一点作为采样点。9.2 根据分析方法分为化学法和仪器直接测试法。化学法使用采样管将样气抽入吸收液、固体吸附剂、真空瓶、注射器或气袋，样品经化学分析或仪器分析得到污染物含量。''',
 ('gb-stack-sampling',27): '''9.2.1 化学法采样系统可由采样管、连接导管、吸收瓶或吸附管、流量计量箱和抽气泵等组成，抽气泵应严密不漏气；也可使用真空瓶或注射器采样系统。仪器测试法通过采样管和除湿器，用抽气泵将样气送入分析仪器，直接指示气态污染物含量。''',
 ('gb-stack-sampling',28): '''9.2.1.3 有机物可能在不同烟气温度下以颗粒物或气态存在，采样前应根据污染物状态确定采样方法和装置；颗粒物部分按颗粒物等速采样方法采样。9.3 采样管应根据被测污染物特征选择。采样管、衬管、滤料等材料不得与待测污染物发生化学反应，不得被排气腐蚀，并应在排气温度和流速下保持机械强度。滤料应不吸收、不与待测污染物反应且能耐高温排气。''',
 ('gb-stack-sampling',29): '''9.3.1.4 为防止样气水分在采样管内冷凝、避免待测污染物溶于水产生误差，采样管常需加热。二氧化硫、氮氧化物、氟化物、氯化氢、硫化氢、溴、酚、氨、光气、丙烯醛、氰化氢等最低加热温度通常高于120℃，具体材料和温度应按待测污染物选择。连接管应选择不吸收、不与待测污染物反应且便于密封的材料。''',
 ('gb-stack-sampling',30): '''9.3.3 除湿和气液分离：使用仪器直接监测时，如水分在连接管和仪器中冷凝干扰测定，应在采样管气体出口处除湿和气液分离。除湿装置应使除湿后气体中污染物损失不大于5%。9.3.4 吸收瓶应根据污染物选择多孔筛板、气泡或冲击式吸收瓶，并保证密封不漏气。''',
 ('gb-stack-sampling',31): '''9.3.5 吸附管中的吸附剂可根据污染物性质选用硅胶、活性炭或高分子多孔微球，吸附剂应紧密填充且采样前后密封。9.3.6 流量计量装置包括干燥器、温度计、压力表、转子流量计或累计流量计、流量调节装置；精度和量程应与采样流量匹配。9.3.7 抽气泵应克服烟道及采样系统阻力，流量计置于抽气泵出口时抽气泵应严密不漏气。9.3.8 真空瓶容积2 L，材料不得吸收或与待测污染物反应；注射器容积100或200 mL。仪器法应配置过滤、除湿和校正气体。''',
}

def fetch(url, referer=None):
    headers={'User-Agent':'Mozilla/5.0','Accept':'application/pdf,text/html;q=0.9,*/*;q=0.8'}
    if referer: headers['Referer']=referer
    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req, timeout=35) as response:
        return response.read()

def clean_html(raw):
    text = raw.decode('utf-8', 'replace')
    text = re.sub(r'<(script|style)\b[^>]*>.*?</\1>', '', text, flags=re.S|re.I)
    # Keep the main article, avoiding navigation becoming retrieval evidence.
    start = text.find('为贯彻')
    if start < 0: start = text.find('浙江省人民政府于')
    text = text[start:] if start >= 0 else ''
    text = re.sub('<[^>]+>', ' ', text)
    return re.sub(r'\s+', ' ', text).strip()[:2200]

def main():
    out = ROOT/'data'; out.mkdir(exist_ok=True)
    pdfs = ROOT/'public'/'documents'; pdfs.mkdir(parents=True,exist_ok=True)
    chunks=[]
    for doc in CATALOG:
        doc['checked']='2026-09-20'; doc['available']=False
        try:
            if doc['id']=='zj-urban':
                html = fetch(doc['source']).decode('utf-8','replace')
                links = re.findall(r'(?:href|url)=[\"\x27]([^\"\x27]+)',html)
                candidates=[x for x in links if '.pdf' in x.lower() or 'downfile' in x.lower()]
                if candidates:
                    doc['url']=urllib.parse.urljoin(doc['source'],candidates[0].replace('&amp;','&'))
            if doc['url']:
                filename=doc['id']+'.pdf'
                try: raw=fetch(doc['url'],doc['source'])
                except Exception:
                    cached=pdfs/filename
                    if not cached.exists(): raise
                    raw=cached.read_bytes()
                if not raw.startswith(b'%PDF'): raise ValueError('Server did not return a PDF')
                (pdfs/filename).write_bytes(raw)
                doc['pdf']='/documents/'+filename
                doc['hash']=hashlib.sha256(raw).hexdigest()
                reader=PdfReader(pdfs/filename)
                doc['pages']=len(reader.pages)
                for index,page in enumerate(reader.pages):
                    text=MANUAL_PAGES.get((doc['id'],index+1)) or re.sub(r'[ \t]+',' ',page.extract_text() or '').strip()
                    if text.count('/G')>20: continue
                    if not text: continue
                    # ponytail: page-sized chunks preserve tables; refine to clauses as corpus grows.
                    chunks.append(dict(id=doc['id']+'-'+str(index+1),docId=doc['id'],page=index+1,text=text))
                doc['available']=True
            elif doc['id']=='gb-amendment':
                text=clean_html(fetch(doc['source']))
                if '2026年3月1日' not in text: raise ValueError('Announcement body not verified')
                chunks.append(dict(id='announcement-1',docId=doc['id'],page=None,text=text))
                doc['hash']=hashlib.sha256(text.encode()).hexdigest(); doc['available']=True
        except Exception as exc:
            doc['error']=str(exc)[:160]
        print(doc['id'], 'OK' if doc['available'] else 'metadata only', doc.get('pages',0))
    (out/'knowledge.json').write_text(json.dumps(dict(documents=CATALOG,chunks=chunks),ensure_ascii=False,indent=2),encoding='utf-8')
    print('Indexed pages:',len(chunks))

if __name__=='__main__': main()
