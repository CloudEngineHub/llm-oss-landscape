#!/usr/bin/env python3
"""Insert a full-bleed image slide into a PPTX copy without touching source slides."""

from __future__ import annotations

import argparse
import re
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile
import xml.etree.ElementTree as ET


NS = {
    "a": "http://schemas.openxmlformats.org/drawingml/2006/main",
    "p": "http://schemas.openxmlformats.org/presentationml/2006/main",
    "r": "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
    "rel": "http://schemas.openxmlformats.org/package/2006/relationships",
    "ct": "http://schemas.openxmlformats.org/package/2006/content-types",
    "p14": "http://schemas.microsoft.com/office/powerpoint/2010/main",
}

for prefix, uri in NS.items():
    ET.register_namespace("" if prefix in {"rel", "ct"} else prefix, uri)


def qname(prefix: str, local: str) -> str:
    return f"{{{NS[prefix]}}}{local}"


def next_numeric_id(values: list[str], prefix: str) -> str:
    nums = [int(value[len(prefix) :]) for value in values if value.startswith(prefix) and value[len(prefix) :].isdigit()]
    return f"{prefix}{max(nums, default=0) + 1}"


def slide_xml(width: str, height: str, image_rid: str) -> bytes:
    xml = f"""<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sld xmlns:a="{NS["a"]}" xmlns:r="{NS["r"]}" xmlns:p="{NS["p"]}">
  <p:cSld>
    <p:spTree>
      <p:nvGrpSpPr>
        <p:cNvPr id="1" name=""/>
        <p:cNvGrpSpPr/>
        <p:nvPr/>
      </p:nvGrpSpPr>
      <p:grpSpPr>
        <a:xfrm>
          <a:off x="0" y="0"/>
          <a:ext cx="0" cy="0"/>
          <a:chOff x="0" y="0"/>
          <a:chExt cx="0" cy="0"/>
        </a:xfrm>
      </p:grpSpPr>
      <p:pic>
        <p:nvPicPr>
          <p:cNvPr id="2" name="Inserted evidence slide"/>
          <p:cNvPicPr/>
          <p:nvPr/>
        </p:nvPicPr>
        <p:blipFill>
          <a:blip r:embed="{image_rid}"/>
          <a:stretch><a:fillRect/></a:stretch>
        </p:blipFill>
        <p:spPr>
          <a:xfrm>
            <a:off x="0" y="0"/>
            <a:ext cx="{width}" cy="{height}"/>
          </a:xfrm>
          <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
        </p:spPr>
      </p:pic>
    </p:spTree>
  </p:cSld>
  <p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr>
</p:sld>
"""
    return xml.encode("utf-8")


def slide_rels_xml(image_name: str) -> bytes:
    xml = f"""<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="{NS["rel"]}">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout2.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/{image_name}"/>
</Relationships>
"""
    return xml.encode("utf-8")


def insert_slide(source: Path, image: Path, output: Path, after_index: int) -> None:
    with ZipFile(source) as archive:
        parts = {name: archive.read(name) for name in archive.namelist()}

    slide_numbers = [
        int(match.group(1))
        for name in parts
        if (match := re.fullmatch(r"ppt/slides/slide(\d+)\.xml", name))
    ]
    media_numbers = [
        int(match.group(1))
        for name in parts
        if (match := re.fullmatch(r"ppt/media/image(\d+)\.[^.]+", name))
    ]
    slide_number = max(slide_numbers, default=0) + 1
    image_name = f"image{max(media_numbers, default=0) + 1}{image.suffix.lower()}"

    presentation = ET.fromstring(parts["ppt/presentation.xml"])
    slide_size = presentation.find("p:sldSz", NS)
    if slide_size is None:
        raise ValueError("ppt/presentation.xml has no slide size")
    width = slide_size.attrib["cx"]
    height = slide_size.attrib["cy"]

    slide_list = presentation.find("p:sldIdLst", NS)
    if slide_list is None:
        raise ValueError("ppt/presentation.xml has no slide list")

    presentation_rels = ET.fromstring(parts["ppt/_rels/presentation.xml.rels"])
    rel_ids = [rel.attrib["Id"] for rel in presentation_rels.findall("rel:Relationship", NS)]
    new_rel_id = next_numeric_id(rel_ids, "rId")
    new_rel = ET.SubElement(presentation_rels, qname("rel", "Relationship"))
    new_rel.set("Id", new_rel_id)
    new_rel.set("Type", "http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide")
    new_rel.set("Target", f"slides/slide{slide_number}.xml")

    slide_ids = [int(node.attrib["id"]) for node in slide_list.findall("p:sldId", NS)]
    new_slide_id = str(max(slide_ids, default=255) + 1)
    slide_node = ET.Element(qname("p", "sldId"))
    slide_node.set("id", new_slide_id)
    slide_node.set(qname("r", "id"), new_rel_id)
    slide_list.insert(min(after_index, len(slide_list)), slide_node)

    for section_slide_list in presentation.findall(".//p14:sldIdLst", NS):
        section_ids = section_slide_list.findall("p14:sldId", NS)
        section_node = ET.Element(qname("p14", "sldId"))
        section_node.set("id", new_slide_id)
        section_slide_list.insert(min(after_index, len(section_ids)), section_node)

    content_types = ET.fromstring(parts["[Content_Types].xml"])
    override = ET.SubElement(content_types, qname("ct", "Override"))
    override.set("PartName", f"/ppt/slides/slide{slide_number}.xml")
    override.set("ContentType", "application/vnd.openxmlformats-officedocument.presentationml.slide+xml")

    parts["ppt/presentation.xml"] = ET.tostring(presentation, encoding="utf-8", xml_declaration=True)
    parts["ppt/_rels/presentation.xml.rels"] = ET.tostring(presentation_rels, encoding="utf-8", xml_declaration=True)
    parts["[Content_Types].xml"] = ET.tostring(content_types, encoding="utf-8", xml_declaration=True)
    parts[f"ppt/slides/slide{slide_number}.xml"] = slide_xml(width, height, "rId2")
    parts[f"ppt/slides/_rels/slide{slide_number}.xml.rels"] = slide_rels_xml(image_name)
    parts[f"ppt/media/{image_name}"] = image.read_bytes()

    output.parent.mkdir(parents=True, exist_ok=True)
    with ZipFile(output, "w", compression=ZIP_DEFLATED) as archive:
        for name, data in parts.items():
            archive.writestr(name, data)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", type=Path, required=True)
    parser.add_argument("--image", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--after-index", type=int, default=0, help="Insert after this 1-based slide index; 0 inserts first.")
    args = parser.parse_args()
    insert_slide(args.source, args.image, args.output, max(args.after_index, 0))


if __name__ == "__main__":
    main()
